/**
 * Accounts Manager - Handles user account management UI
 */
export class AccountsManager {
    constructor(dashboardManager) {
        this.dashboardManager = dashboardManager;
    }

    /**
     * Render accounts list in settings
     * @param {Object} accounts - Map of platform -> array of accounts
     */
    renderAccountsList(accounts) {
        const container = document.getElementById('accounts-list');
        if (!container) return;

        container.innerHTML = '';

        if (!accounts || Object.keys(accounts).length === 0) {
            container.innerHTML = '<div class="empty-accounts">No connected accounts found. Login to social media to track automatically.</div>';
            return;
        }

        Object.entries(accounts).forEach(([platform, platformAccounts]) => {
            if (!platformAccounts || platformAccounts.length === 0) return;

            const group = document.createElement('div');
            group.className = 'account-group';

            const header = document.createElement('h4');
            header.className = `platform-header ${platform}`;
            header.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);

            group.appendChild(header);

            platformAccounts.forEach(account => {
                const item = document.createElement('div');
                item.className = 'account-item';

                const info = document.createElement('div');
                info.className = 'account-info';

                // Avatar or placeholder
                const avatar = document.createElement('div');
                avatar.className = 'account-avatar';
                avatar.textContent = (account.username || '?')[0].toUpperCase();

                const details = document.createElement('div');
                details.innerHTML = `
          <div class="account-username">@${account.username || 'unknown'}</div>
          ${account.fullName ? `<div class="account-fullname">${account.fullName}</div>` : ''}
        `;

                info.appendChild(avatar);
                info.appendChild(details);

                const actions = document.createElement('div');
                actions.className = 'account-actions';

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-icon delete-account';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.title = 'Remove Account';
                deleteBtn.onclick = () => this.removeAccount(platform, account.id);

                actions.appendChild(deleteBtn);

                item.appendChild(info);
                item.appendChild(actions);
                group.appendChild(item);
            });

            container.appendChild(group);
        });
    }

    async removeAccount(platform, accountId) {
        if (!confirm('Are you sure you want to remove this account? This will stop tracking for this specific account.')) return;

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'REMOVE_USER_ACCOUNT',
                platform,
                accountId
            });

            if (response && response.success) {
                // Refresh settings or just accounts
                this.dashboardManager.modalsManager.refreshSettings(); // Assuming method exists or triggers reload
            } else {
                alert('Failed to remove account: ' + (response?.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error removing account:', error);
        }
    }
}
