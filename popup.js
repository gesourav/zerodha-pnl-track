document.addEventListener('DOMContentLoaded', () => {
    const positionsList = document.getElementById('positionsList');
    const groupsList = document.getElementById('groupsList');
    
    // Nav
    const mainView = document.getElementById('mainView');
    const settingsView = document.getElementById('settingsView');
    const settingsBtn = document.getElementById('settingsBtn');
    const backBtn = document.getElementById('backBtn');
    
    settingsBtn.addEventListener('click', () => {
        mainView.classList.add('hidden');
        settingsView.classList.remove('hidden');
    });
    backBtn.addEventListener('click', () => {
        settingsView.classList.add('hidden');
        mainView.classList.remove('hidden');
    });
    
    // Load Settings
    chrome.storage.local.get(['telegram', 'groups', 'currentPositions'], (res) => {
        if (res.telegram) {
            document.getElementById('botToken').value = res.telegram.botToken || '';
            document.getElementById('chatId').value = res.telegram.chatId || '';
        }
        
        renderPositions(res.currentPositions || []);
        renderGroups(res.groups || []);
    });
    
    // Save Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        const botToken = document.getElementById('botToken').value.trim();
        const chatId = document.getElementById('chatId').value.trim();
        chrome.storage.local.set({ telegram: { botToken, chatId } }, () => {
            alert('Settings saved!');
            document.getElementById('backBtn').click();
        });
    });

    // Positions rendering
    function renderPositions(positions) {
        // Keep track of checked before wiping
        const checkedMap = {};
        document.querySelectorAll('.pos-checkbox:checked').forEach(cb => {
            checkedMap[cb.value] = true;
        });

        positionsList.innerHTML = '';
        if (positions.length === 0) {
            positionsList.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">No open NFO positions detected. Please open Kite tabs.</div>';
            return;
        }
        
        positions.forEach(pos => {
            if (pos.qty === 0) return; // Hide closed legs
            
            const div = document.createElement('div');
            div.className = 'position-item';
            
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = pos.instrument;
            cb.className = 'pos-checkbox';
            if (checkedMap[pos.instrument]) cb.checked = true;
            
            const details = document.createElement('div');
            details.className = 'position-details';
            
            const inst = document.createElement('span');
            inst.className = 'instrument-name';
            inst.textContent = `${pos.instrument} (${pos.qty})`;
            inst.title = pos.instrument;
            
            const pnl = document.createElement('span');
            pnl.className = `pnl ${pos.pnl >= 0 ? 'positive' : 'negative'}`;
            pnl.textContent = pos.pnl.toFixed(2);
            
            details.appendChild(inst);
            details.appendChild(pnl);
            
            div.appendChild(cb);
            div.appendChild(details);
            positionsList.appendChild(div);
        });
    }

    // Create Group
    document.getElementById('createGroupBtn').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.pos-checkbox:checked');
        if (checkboxes.length === 0) {
            alert('Select at least one position');
            return;
        }
        
        const name = document.getElementById('groupName').value.trim() || `Group ${Date.now().toString().slice(-4)}`;
        let tVal = document.getElementById('groupTarget').value;
        let sVal = document.getElementById('groupSL').value;
        
        const target = tVal ? parseFloat(tVal) : null;
        const stoploss = sVal ? parseFloat(sVal) : null;
        
        const instruments = Array.from(checkboxes).map(cb => cb.value);
        
        const newGroup = {
            id: Date.now().toString(),
            name,
            instruments,
            target,
            stoploss
        };
        
        chrome.storage.local.get(['groups'], (res) => {
            const groups = res.groups || [];
            groups.push(newGroup);
            chrome.storage.local.set({ groups }, () => {
                renderGroups(groups);
                document.getElementById('groupName').value = '';
                document.getElementById('groupTarget').value = '';
                document.getElementById('groupSL').value = '';
                checkboxes.forEach(c => c.checked = false);
            });
        });
    });

    // Render Groups
    function renderGroups(groups) {
        groupsList.innerHTML = '';
        if (groups.length === 0) {
            groupsList.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">No active groups.</div>';
            return;
        }
        
        chrome.storage.local.get(['currentPositions'], (res) => {
            const positions = res.currentPositions || [];
            
            groups.forEach(group => {
                let currentPnl = 0;
                let isSqOff = true;

                group.instruments.forEach(inst => {
                    const pos = positions.find(p => p.instrument === inst);
                    if (pos) {
                        currentPnl += pos.pnl;
                        if(pos.qty !== 0) isSqOff = false;
                    }
                });
                
                const div = document.createElement('div');
                div.className = 'group-item';
                div.style.opacity = isSqOff ? '0.5' : '1';
                
                let html = `
                    <div class="group-header">
                        <span>${group.name} ${isSqOff ? '(Closed)' : ''}</span>
                        <span class="pnl ${currentPnl >= 0 ? 'positive' : 'negative'}">₹${currentPnl.toFixed(2)}</span>
                    </div>
                    <div class="group-targets">
                        <span>TG: ${group.target !== null ? '₹'+group.target : '-'} | SL: ${group.stoploss !== null ? '₹'+group.stoploss : '-'}</span>
                        <button class="delete-btn" data-id="${group.id}">Delete</button>
                    </div>
                    <div style="font-size:10px; color:#64748b; margin-top:4px;">
                        Legs: ${group.instruments.join(', ')}
                    </div>
                `;
                div.innerHTML = html;
                
                div.querySelector('.delete-btn').addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const updated = groups.filter(g => g.id !== id);
                    chrome.storage.local.set({ groups: updated }, () => {
                        renderGroups(updated);
                    });
                });
                
                groupsList.appendChild(div);
            });
        });
    }

    // Auto-refresh UI every second if open
    setInterval(() => {
        chrome.storage.local.get(['currentPositions', 'groups'], (res) => {
            if(res.currentPositions) {
                renderPositions(res.currentPositions || []);
                renderGroups(res.groups || []);
            }
        });
    }, 1500);
});
