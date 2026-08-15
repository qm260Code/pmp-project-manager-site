import { store } from '../store.js';
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_REDIRECT_URL,
  isSupabaseConfigured
} from '../config/supabase.js';

class CloudSync {
  constructor() {
    this.client = null;
    this.session = null;
    this.project = null;
    this.role = null;
    this.stakeholderCount = 0;
    this.personnelCount = 0;
    this.passwordChangeRequired = false;
    this.recordedSessionId = null;
    this.errorMessage = null;
    this.errorCode = null;
    this.status = 'not-configured';
    this.listeners = new Set();
    this.saveTimer = null;
    this.loading = false;
    this.started = false;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState() {
    return {
      status: this.status,
      configured: isSupabaseConfigured(),
      email: this.session?.user?.email || '',
      project: this.project,
      role: this.role,
      stakeholderCount: this.stakeholderCount,
      personnelCount: this.personnelCount,
      passwordChangeRequired: this.passwordChangeRequired,
      authorized: this.role === 'admin' || this.role === 'viewer',
      canEdit: this.role === 'admin',
      errorMessage: this.errorMessage,
      errorCode: this.errorCode
    };
  }

  emit() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  async getClient() {
    if (this.client) return this.client;
    if (!isSupabaseConfigured()) return null;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    this.client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    return this.client;
  }

  async start() {
    if (this.started) return;
    this.started = true;
    if (!isSupabaseConfigured()) {
      this.status = 'not-configured';
      this.emit();
      return;
    }

    const client = await this.getClient();
    this.status = 'loading';
    this.errorMessage = null;
    this.errorCode = null;
    this.emit();

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    this.session = data.session;
    await this.handleSession(this.session);

    client.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      const isUpdate = event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED';
      window.setTimeout(() => this.handleSession(session, isUpdate).catch(error => {
        console.warn('[CloudSync] Unable to apply authentication state.', error);
        this.status = 'error';
        this.errorMessage = error.message;
        this.emit();
      }), 0);
    });

    store.subscribe('state-updated', () => this.queueSave());
  }

  async handleSession(session, isUpdate = false) {
    const previousUserId = this.session?.user?.id;
    const newUserId = session?.user?.id;

    this.session = session;
    this.errorMessage = null;
    this.errorCode = null;

    if (!session) {
      this.project = null;
      this.role = null;
      this.stakeholderCount = 0;
      this.personnelCount = 0;
      this.passwordChangeRequired = false;
      this.recordedSessionId = null;
      this.status = 'signed-out';
      this.emit();
      return;
    }

    // Prevent clearing state and UI flicker if this is just a token refresh for the same user
    if (isUpdate && previousUserId === newUserId && this.role) {
      this.emit();
      return;
    }

    this.project = null;
    this.role = null;
    this.stakeholderCount = 0;
    this.personnelCount = 0;
    this.passwordChangeRequired = false;
    await this.loadAvailableProject();
  }

  async sendMagicLink(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const client = await this.getClient();
    if (!client) throw new Error('Supabase is not configured.');

    this.status = 'loading';
    this.errorMessage = null;
    this.errorCode = null;
    this.emit();
    const { data: allowed, error: accessError } = await client.rpc('can_request_magic_link', {
      candidate_email: normalizedEmail
    });
    if (accessError) throw accessError;
    if (!allowed) {
      this.status = 'access-denied';
      this.emit();
      const error = new Error('This email is not in the stakeholder allowlist.');
      error.code = 'access_denied';
      throw error;
    }

    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: SUPABASE_REDIRECT_URL,
        shouldCreateUser: true
      }
    });
    if (error) {
      this.status = 'error';
      this.errorMessage = error.message;
      this.errorCode = error.code || null;
      this.emit();
      throw error;
    }
    this.status = 'magic-link-sent';
    this.emit();
  }

  async signInWithPassword(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const client = await this.getClient();
    if (!client) throw new Error('Supabase is not configured.');

    this.status = 'loading';
    this.errorMessage = null;
    this.errorCode = null;
    this.emit();
    const { error } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password: String(password || '')
    });
    if (error) {
      this.status = 'error';
      this.errorMessage = error.message;
      this.errorCode = error.code || null;
      this.emit();
      throw error;
    }
  }

  async signOut() {
    const client = await this.getClient();
    if (client) await client.auth.signOut();
  }

  async loadAvailableProject() {
    const client = await this.getClient();
    if (!client || !this.session) return;
    this.status = 'loading';
    this.emit();

    const { data: profile, error: profileError } = await client.rpc('current_access_profile');
    if (profileError) throw profileError;
    if (!profile?.role) {
      this.project = null;
      this.role = null;
      this.status = 'access-denied';
      this.emit();
      return;
    }

    this.role = profile.role;
    this.passwordChangeRequired = Boolean(profile.password_change_required);
    this.stakeholderCount = Number(profile.stakeholder_count || 0);
    this.personnelCount = Number(profile.personnel_count || 0);

    const { data: projects, error } = await client
      .from('projects')
      .select('id, name, owner_id, updated_at')
      .order('created_at', { ascending: true });
    if (error) throw error;

    if (!projects?.length) {
      this.project = null;
      this.status = 'ready';
      store.state.cloud = { projectId: null, role: this.role };
      this.emit();
      this.recordVisitorLogin().catch(error => console.warn('[CloudSync] Login audit failed.', error));
      return;
    }

    const preferredId = store.state.cloud?.projectId;
    this.project = projects.find(item => item.id === preferredId) || projects[0];
    await this.loadProjectSnapshot(this.project.id);
    this.status = 'ready';
    this.emit();
    this.recordVisitorLogin().catch(error => console.warn('[CloudSync] Login audit failed.', error));
  }

  async loadProjectSnapshot(projectId) {
    const client = await this.getClient();
    const { data, error } = await client
      .from('project_snapshots')
      .select('payload, updated_at')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.payload) {
      store.state.cloud = { projectId, role: this.role };
      return;
    }

    this.loading = true;
    store.applySharedProjectPayload(data.payload, {
      projectId,
      role: this.role,
      updatedAt: data.updated_at
    });
    this.loading = false;
  }

  async publishCurrentProject() {
    const client = await this.getClient();
    if (!client || !this.session || this.role !== 'admin') {
      throw new Error('Only an administrator can publish a project.');
    }
    const { data: project, error } = await client
      .from('projects')
      .insert({
        name: store.state.projectInfo?.name || 'Untitled project',
        owner_id: this.session.user.id
      })
      .select()
      .single();
    if (error) throw error;

    this.project = project;
    await this.saveNow();
    this.status = 'ready';
    this.emit();
  }

  queueSave() {
    if (this.loading || this.role !== 'admin' || !this.project?.id) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow().catch(() => {
      this.status = 'error';
      this.emit();
    }), 800);
  }

  async saveNow() {
    const client = await this.getClient();
    if (!client || this.role !== 'admin' || !this.project?.id) return;
    const { error } = await client.from('project_snapshots').upsert({
      project_id: this.project.id,
      payload: store.getSharedProjectPayload(),
      updated_by: this.session.user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'project_id' });
    if (error) throw error;

    store.state.cloud = { projectId: this.project.id, role: this.role };
    store.flushSave();
    this.status = 'ready';
    this.emit();
  }

  async refresh() {
    if (!this.session) return;
    await this.loadAvailableProject();
  }

  async replaceStakeholderAllowlist(emails) {
    const client = await this.getClient();
    if (!client || this.role !== 'admin') {
      throw new Error('Only an administrator can upload the stakeholder allowlist.');
    }
    const { data, error } = await client.rpc('replace_stakeholder_allowlist', {
      candidate_emails: emails
    });
    if (error) throw error;
    this.stakeholderCount = Number(data || 0);
    this.emit();
    return this.stakeholderCount;
  }

  async invokeAccessAdmin(body) {
    const client = await this.getClient();
    if (!client || !this.session) throw new Error('Authentication required.');
    const { data, error } = await client.functions.invoke('access-admin', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async recordVisitorLogin() {
    const sessionId = this.session?.access_token?.split('.')?.[1];
    if (!this.session || this.role !== 'viewer' || this.recordedSessionId === sessionId) return;
    await this.invokeAccessAdmin({ action: 'record_login' });
    this.recordedSessionId = sessionId;
  }

  async changePassword(password) {
    const client = await this.getClient();
    if (!client || !this.session) throw new Error('Authentication required.');
    if (this.passwordChangeRequired) {
      await this.invokeAccessAdmin({ action: 'complete_password_change', password });
      const { data, error: refreshError } = await client.auth.refreshSession();
      if (refreshError) throw refreshError;
      await this.handleSession(data.session);
      return;
    }
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  }

  async listManagedPersonnel() {
    const client = await this.getClient();
    if (!client || this.role !== 'admin') throw new Error('Administrator access required.');
    const { data, error } = await client.rpc('list_managed_personnel');
    if (error) throw error;
    return data || [];
  }

  async createManagedPersonnel(email, displayName) {
    if (this.role !== 'admin') throw new Error('Administrator access required.');
    const data = await this.invokeAccessAdmin({ action: 'create_personnel', email, displayName });
    this.personnelCount += 1;
    this.emit();
    return data;
  }

  async deleteManagedPersonnel(userId) {
    if (this.role !== 'admin') throw new Error('Administrator access required.');
    const data = await this.invokeAccessAdmin({ action: 'delete_personnel', userId });
    this.personnelCount = Math.max(0, this.personnelCount - 1);
    this.emit();
    return data;
  }

  async listVisitorLoginAudit(limit = 100) {
    const client = await this.getClient();
    if (!client || this.role !== 'admin') throw new Error('Administrator access required.');
    const { data, error } = await client.rpc('list_visitor_login_audit', { max_rows: limit });
    if (error) throw error;
    return data || [];
  }
}

export const cloudSync = new CloudSync();
