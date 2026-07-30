import { store } from '../store.js';
import { cloudSync } from '../services/cloudSync.js?v=20260731-2';

export class AccessGate {
  constructor() {
    this.state = cloudSync.getState();
    this.form = document.getElementById('access-gate-form');
    this.emailInput = document.getElementById('access-email');
    this.sendButton = document.getElementById('access-send-link');
    this.signOutButton = document.getElementById('access-gate-signout');
    this.languageSelector = document.getElementById('access-language-selector');
    this.status = document.getElementById('access-gate-status');
    this.title = document.getElementById('access-gate-title');
    this.description = document.getElementById('access-gate-description');
    this.emailLabel = document.getElementById('access-email-label');

    this.form?.addEventListener('submit', event => this.handleSignIn(event));
    this.signOutButton?.addEventListener('click', () => cloudSync.signOut());
    this.languageSelector?.addEventListener('change', event => store.changeLanguage(event.target.value));

    cloudSync.subscribe(state => {
      this.state = state;
      this.applyAccessState(state);
      this.render();
    });
    store.subscribe('state-updated', () => this.render());
    this.installReadOnlyGuard();
    this.render();
  }

  text(en, zh) {
    return store.state.language === 'zh' ? zh : en;
  }

  applyAccessState(state) {
    const granted = state.authorized && state.status === 'ready';
    document.body.classList.toggle('access-granted', granted);
    document.body.classList.toggle('access-loading', state.status === 'loading');
    document.body.classList.toggle('access-denied', state.status === 'access-denied');
    document.body.classList.toggle('session-present', Boolean(state.email));
    document.body.classList.toggle('role-admin', state.role === 'admin');
    document.body.classList.toggle('role-viewer', state.role === 'viewer');
    document.body.classList.toggle('access-pending', !granted);
  }

  render() {
    if (!this.form) return;
    const state = this.state;
    const zh = store.state.language === 'zh';
    this.languageSelector.value = zh ? 'zh' : 'en';
    this.title.textContent = this.text('Project workspace sign in', '项目工作区登录');
    this.description.textContent = this.text(
      'Enter an authorized stakeholder or administrator email. We will send a secure sign-in link.',
      '请输入已获授权的干系人或管理员邮箱，系统将发送安全登录链接。'
    );
    this.emailLabel.textContent = this.text('Email address', '邮箱地址');
    this.emailInput.placeholder = this.text('name@example.com', '请输入邮箱地址');
    this.sendButton.textContent = this.text('Send sign-in link', '发送登录链接');
    this.signOutButton.textContent = this.text('Sign out and use another email', '退出并使用其他邮箱');
    this.form.hidden = Boolean(state.email);
    this.signOutButton.hidden = !state.email;
    this.status.className = 'access-gate-status';

    if (state.status === 'loading') {
      this.status.textContent = this.text('Checking access…', '正在验证访问权限…');
    } else if (state.status === 'magic-link-sent') {
      this.status.classList.add('success');
      this.status.textContent = this.text(
        'Sign-in link sent. Open your email and use the link to continue.',
        '登录链接已发送，请打开邮箱并点击链接继续。'
      );
    } else if (state.status === 'access-denied') {
      this.status.classList.add('error');
      this.status.textContent = state.email
        ? this.text(
          `Access is not authorized for ${state.email}.`,
          `${state.email} 未获得访问授权。`
        )
        : this.text(
          'This email is not in the administrator-uploaded stakeholder list.',
          '该邮箱不在管理员上传的干系人名单中。'
        );
    } else if (state.status === 'not-configured' || state.status === 'error') {
      this.status.classList.add('error');
      this.status.textContent = this.text(
        'Secure sign-in is temporarily unavailable. Please contact an administrator.',
        '安全登录暂时不可用，请联系管理员。'
      );
    } else {
      this.status.textContent = '';
    }
  }

  async handleSignIn(event) {
    event.preventDefault();
    const email = this.emailInput.value.trim();
    if (!email) return;
    try {
      await cloudSync.sendMagicLink(email);
    } catch (error) {
      if (error?.code !== 'access_denied') {
        this.state = { ...this.state, status: 'error' };
        this.applyAccessState(this.state);
        this.render();
      }
    }
  }

  installReadOnlyGuard() {
    document.addEventListener('dblclick', event => {
      if (this.state.role !== 'viewer') return;
      if (event.target.closest('.sidebar-link, .gantt-row')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.notifyReadOnly();
      }
    }, true);

    document.addEventListener('change', event => {
      if (this.state.role !== 'viewer') return;
      if (!event.target.closest('.app-main')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.setTimeout(() => store.publish('state-updated', store.state), 0);
      this.notifyReadOnly();
    }, true);
  }

  notifyReadOnly() {
    store.publish('notify', {
      type: 'warning',
      message: this.text(
        'Stakeholder access is view-only.',
        '干系人仅有查看权限。'
      )
    });
  }
}
