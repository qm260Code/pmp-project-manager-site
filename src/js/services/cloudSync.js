import { PROJECT_KEYS, store } from '../store.js';
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
    return { status: this.status, configured: isSupabaseConfigured(), email: this.session?.user?.email || '', project: this.project, role: this.role, canEdit: this.role === 'editor' };
  }

  emit() { this.listeners.forEach(listener => listener(this.getState())); }

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
    if (!isSupabaseConfigured()) { this.status = 'not-configured'; this.emit(); return; }
    const client = await this.getClient();
    const { data } = await client.auth.getSession();
    this.session = data.session;
    this.status = this.session ? 'loading' : 'signed-out';
    this.emit();

    client.auth.onAuthStateChange((_event, session) => {
      this.session = session;
      if (session) this.loadAvailableProject();
      else { this.project = null; this.role = null; this.status = 'signed-out'; this.emit(); }
    });
    store.subscribe('state-updated', () => this.queueSave());
    if (this.session) await this.loadAvailableProject();
  }

  async sendMagicLink(email) {
    const client = await this.getClient();
    if (!client) throw new Error('Supabase is not configured.');
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: SUPABASE_REDIRECT_URL } });
    if (error) throw error;
    this.status = 'magic-link-sent';
    this.emit();
  }

  async signOut() { await (await this.getClient())?.auth.signOut(); }

  async loadAvailableProject() {
    const client = await this.getClient();
    if (!client || !this.session) return;
    this.status = 'loading'; this.emit();
    const { data: memberships, error } = await client.from('project_members').select('project_id, role, projects(id, name, owner_id, updated_at)').order('created_at', { ascending: true });
    if (error) { this.status = 'error'; this.emit(); throw error; }
    if (!memberships?.length) { this.project = null; this.role = null; this.status = 'ready'; this.emit(); return; }
    const preferredId = store.state.cloud?.projectId;
    const membership = memberships.find(item => item.project_id === preferredId) || memberships[0];
    this.project = Array.isArray(membership.projects) ? membership.projects[0] : membership.projects; this.role = membership.role;
    await this.loadProjectSnapshot(this.project.id);
    this.status = 'ready'; this.emit();
  }

  async loadProjectSnapshot(projectId) {
    const client = await this.getClient();
    const { data, error } = await client.from('project_snapshots').select('payload, updated_at').eq('project_id', projectId).single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data?.payload) return;
    this.loading = true;
    store.applySharedProjectPayload(data.payload, { projectId, role: this.role, updatedAt: data.updated_at });
    this.loading = false;
  }

  async publishCurrentProject() {
    const client = await this.getClient();
    if (!client || !this.session) throw new Error('Please sign in first.');
    const { data: project, error } = await client.from('projects').insert({ name: store.state.projectInfo?.name || 'Untitled project', owner_id: this.session.user.id }).select().single();
    if (error) throw error;
    this.project = project; this.role = 'editor';
    await this.saveNow(); this.status = 'ready'; this.emit();
  }

  queueSave() {
    if (this.loading || this.role !== 'editor' || !this.project?.id) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow().catch(() => { this.status = 'error'; this.emit(); }), 800);
  }

  async saveNow() {
    const client = await this.getClient();
    if (!client || this.role !== 'editor' || !this.project?.id) return;
    const { error } = await client.from('project_snapshots').upsert({ project_id: this.project.id, payload: store.getSharedProjectPayload(), updated_by: this.session.user.id, updated_at: new Date().toISOString() }, { onConflict: 'project_id' });
    if (error) throw error;
    store.state.cloud = { projectId: this.project.id, role: this.role };
    store.flushSave(); this.status = 'ready'; this.emit();
  }

  async inviteViewer(email) {
    const client = await this.getClient();
    if (!client || this.role !== 'editor' || !this.project?.id) throw new Error('Only a project editor can invite viewers.');
    const { error } = await client.rpc('invite_project_viewer', { target_project_id: this.project.id, invited_email: email.trim().toLowerCase() });
    if (error) throw error;
  }
}

export const cloudSync = new CloudSync();
