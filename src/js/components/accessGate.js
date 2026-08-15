import { store } from '../store.js';
import { cloudSync } from '../services/cloudSync.js?v=20260815-2';

export class AccessGate {
  constructor() {
    this.state = cloudSync.getState();
    this.form = document.getElementById('access-gate-form');
    this.emailInput = document.getElementById('access-email');
    this.passwordInput = document.getElementById('access-password');
    this.passwordField = document.getElementById('access-password-field');
    this.passwordLabel = document.getElementById('access-password-label');
    this.sendButton = document.getElementById('access-send-link');
    this.methodButtons = [...document.querySelectorAll('[data-access-mode]')];
    this.passwordChangeForm = document.getElementById('access-password-change-form');
    this.passwordChangeHelp = document.getElementById('access-password-change-help');
    this.newPasswordInput = document.getElementById('access-new-password');
    this.confirmPasswordInput = document.getElementById('access-confirm-password');
    this.newPasswordLabel = document.getElementById('access-new-password-label');
    this.confirmPasswordLabel = document.getElementById('access-confirm-password-label');
    this.changePasswordButton = document.getElementById('access-change-password');
    this.signOutButton = document.getElementById('access-gate-signout');
    this.languageSelector = document.getElementById('access-language-selector');
    this.status = document.getElementById('access-gate-status');
    this.title = document.getElementById('access-gate-title');
    this.description = document.getElementById('access-gate-description');
    this.emailLabel = document.getElementById('access-email-label');
    this.mode = 'magic-link';

    this.form?.addEventListener('submit', event => this.handleSignIn(event));
    this.passwordChangeForm?.addEventListener('submit', event => this.handlePasswordChange(event));
    this.methodButtons.forEach(button => button.addEventListener('click', () => {
      this.mode = button.dataset.accessMode;
      this.render();
    }));
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
      'Use a secure email link, or sign in with an administrator-issued account.',
      '使用安全邮件链接登录，或使用管理员创建的账号和密码登录。'
    );
    this.methodButtons[0].textContent = this.text('Email link', '邮件链接');
    this.methodButtons[1].textContent = this.text('Email + password', '邮箱 + 密码');
    this.methodButtons.forEach(button => button.classList.toggle('active', button.dataset.accessMode === this.mode));
    this.emailLabel.textContent = this.text('Email address', '邮箱地址');
    this.emailInput.placeholder = this.text('name@example.com', '请输入邮箱地址');
    this.passwordLabel.textContent = this.text('Password', '密码');
    this.passwordInput.placeholder = this.text('Enter your password', '请输入密码');
    this.passwordField.hidden = this.mode !== 'password';
    this.passwordInput.required = this.mode === 'password';
    this.sendButton.disabled = state.status === 'loading';
    this.changePasswordButton.disabled = state.status === 'loading';
    this.sendButton.textContent = this.mode === 'password'
      ? this.text('Sign in', '登录')
      : this.text('Send sign-in link', '发送登录链接');
    this.passwordChangeHelp.textContent = this.text(
      'For security, choose a new password before viewing project data.',
      '为确保安全，请先设置新密码，然后再查看项目数据。'
    );
    this.newPasswordLabel.textContent = this.text('New password (at least 10 characters)', '新密码（至少 10 个字符）');
    this.confirmPasswordLabel.textContent = this.text('Confirm new password', '确认新密码');
    this.changePasswordButton.textContent = this.text('Set password and continue', '设置密码并继续');
    this.signOutButton.textContent = this.text('Sign out and use another email', '退出并使用其他邮箱');
    this.form.hidden = Boolean(state.email) || state.passwordChangeRequired;
    this.passwordChangeForm.hidden = !state.passwordChangeRequired;
    document.querySelector('.access-method-tabs').hidden = Boolean(state.email) || state.passwordChangeRequired;
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
    } else if (state.status === 'password-change-required') {
      this.status.textContent = this.text(
        'Your temporary password was accepted. Set a private password to continue.',
        '临时密码验证成功，请设置个人密码后继续。'
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
      this.status.textContent = this.friendlyError(state);
    } else {
      this.status.textContent = '';
    }
  }

  friendlyError(state) {
    const code = String(state.errorCode || '').toLowerCase();
    const message = String(state.errorMessage || '').toLowerCase();
    const adminEmail = this.isAdminEmail(this.emailInput?.value);
    if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
      if (adminEmail) {
        return this.text(
          'The administrator email or password is incorrect. You can use Email link to sign in; administrators are not required to set a new password.',
          '管理员邮箱或密码不正确。你可以改用“邮件链接”登录；管理员不会被要求设置新密码。'
        );
      }
      return this.text('The email or password is incorrect.', '邮箱或密码不正确。');
    }
    if (code === 'over_email_send_rate_limit' || message.includes('email rate limit')) {
      return this.text(
        'Too many sign-in emails were requested. Please wait before trying again, or use password sign-in if your account has one.',
        '登录邮件请求次数过多，请稍后再试；如果账号已设置密码，也可以使用密码登录。'
      );
    }
    return this.text(
      state.errorMessage || 'Secure sign-in is temporarily unavailable. Please contact an administrator.',
      '安全登录暂时不可用，请联系管理员。'
    );
  }

  isAdminEmail(value) {
    return [
      'moq1cgq@bosch.com',
      '756320422@qq.com',
      'qiutong.mo@cn.bosch.com'
    ].includes(String(value || '').trim().toLowerCase());
  }

  async handleSignIn(event) {
    event.preventDefault();
    const email = this.emailInput.value.trim();
    if (!email) return;
    try {
      if (this.mode === 'password') await cloudSync.signInWithPassword(email, this.passwordInput.value);
      else await cloudSync.sendMagicLink(email);
    } catch (error) {
      if (error?.code !== 'access_denied') {
        // errorMessage is set in the cloudSync.js state now, so just re-apply and render
        this.state = { ...this.state, status: 'error', errorMessage: error.message || 'An error occurred' };
        this.applyAccessState(this.state);
        this.render();
      }
    }
  }

  async handlePasswordChange(event) {
    event.preventDefault();
    const password = this.newPasswordInput.value;
    if (password.length < 10 || password !== this.confirmPasswordInput.value) {
      this.status.className = 'access-gate-status error';
      this.status.textContent = this.text(
        'Passwords must match and contain at least 10 characters.',
        '两次密码必须一致，且至少包含 10 个字符。'
      );
      return;
    }
    try {
      await cloudSync.changePassword(password);
      this.newPasswordInput.value = '';
      this.confirmPasswordInput.value = '';
    } catch (error) {
      this.status.className = 'access-gate-status error';
      this.status.textContent = error.message || this.text('Unable to change password.', '无法修改密码。');
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
