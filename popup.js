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
            positionsList.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">No open FnO positions detected. Please open Kite tabs.</div>';
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
    document.getElementById('createGroupBtn').addEventListener('click', (e) => {
        const btn = e.target;
        const editId = btn.getAttribute('data-edit-id');

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
        
        chrome.storage.local.get(['groups'], (res) => {
            let groups = res.groups || [];
            
            if (editId) {
                const index = groups.findIndex(g => g.id === editId);
                if (index !== -1) {
                    groups[index] = {
                        ...groups[index],
                        name, instruments, target, stoploss
                    };
                }
                btn.textContent = 'Create Group';
                btn.removeAttribute('data-edit-id');
                document.getElementById('cancelEditBtn').classList.add('hidden');
            } else {
                const newGroup = {
                    id: Date.now().toString(),
                    name,
                    instruments,
                    target,
                    stoploss
                };
                groups.push(newGroup);
            }
            
            chrome.storage.local.set({ groups }, () => {
                renderGroups(groups);
                document.getElementById('groupName').value = '';
                document.getElementById('groupTarget').value = '';
                document.getElementById('groupSL').value = '';
                document.querySelectorAll('.pos-checkbox').forEach(c => c.checked = false);

                document.getElementById('lblGroupName').textContent = 'Group Name';
                document.getElementById('lblGroupTarget').textContent = 'Target (₹)';
                document.getElementById('lblGroupSL').textContent = 'Stoploss (₹)';
            });
        });
    });

    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        const btn = document.getElementById('createGroupBtn');
        btn.textContent = 'Create Group';
        btn.removeAttribute('data-edit-id');
        document.getElementById('cancelEditBtn').classList.add('hidden');
        
        document.getElementById('groupName').value = '';
        document.getElementById('groupTarget').value = '';
        document.getElementById('groupSL').value = '';
        document.querySelectorAll('.pos-checkbox').forEach(c => c.checked = false);

        document.getElementById('lblGroupName').textContent = 'Group Name';
        document.getElementById('lblGroupTarget').textContent = 'Target (₹)';
        document.getElementById('lblGroupSL').textContent = 'Stoploss (₹)';
    });

    // Parse CE/PE type and strike from instrument string
    function parseInstrument(instrumentStr) {
        const match = instrumentStr.match(/(\d+)\s*(CE|PE)/i);
        if (!match) return { strike: '', optionType: '' };
        return { strike: parseInt(match[1], 10), optionType: match[2].toUpperCase() };
    }

    // Download group positions as styled Excel (.xls)
    function downloadGroupExcel(group, positions) {
        const rows = group.instruments.map(inst => {
            const pos = positions.find(p => p.instrument === inst);
            if (!pos || pos.qty === 0) return null;
            const { strike, optionType } = parseInstrument(inst);
            const tradeType = pos.qty < 0 ? 'SELL' : 'BUY';
            const qty = Math.abs(pos.qty);
            const ltp = pos.ltp || 0;
            const exposure = qty * ltp;
            return { tradeType, strike, optionType, qty, ltp, exposure };
        }).filter(Boolean);

        const ce = rows.filter(r => r.optionType === 'CE');
        const pe = rows.filter(r => r.optionType === 'PE');
        const maxRows = Math.max(ce.length, pe.length);

        const ceHdr = 'background:#C00000;color:white;font-weight:bold;text-align:center;padding:4px 8px;border:1px solid #aaa;';
        const peHdr = 'background:#375623;color:white;font-weight:bold;text-align:center;padding:4px 8px;border:1px solid #aaa;';
        const colHdr = 'background:#1a1a1a;color:white;font-weight:bold;padding:4px 8px;border:1px solid #aaa;';
        const cell = 'padding:4px 8px;border:1px solid #ccc;';
        const sellStyle = 'color:#C00000;font-weight:bold;padding:4px 8px;border:1px solid #ccc;';
        const buyStyle = 'color:#375623;font-weight:bold;padding:4px 8px;border:1px solid #ccc;';
        const spacer = '<td style="padding:4px 16px;"></td>';

        let tableRows = `<tr>
            <td colspan="5" style="${ceHdr}">CE</td>
            ${spacer}
            <td colspan="5" style="${peHdr}">PE</td>
        </tr><tr>
            <th style="${colHdr}">Type</th><th style="${colHdr}">Strike</th><th style="${colHdr}">Qty</th><th style="${colHdr}">Price</th><th style="${colHdr}">Exposure</th>
            ${spacer}
            <th style="${colHdr}">Type</th><th style="${colHdr}">Strike</th><th style="${colHdr}">Qty</th><th style="${colHdr}">Price</th><th style="${colHdr}">Exposure</th>
        </tr>`;

        for (let i = 0; i < maxRows; i++) {
            const c = ce[i];
            const p = pe[i];
            tableRows += '<tr>';
            if (c) {
                tableRows += `<td style="${c.tradeType==='SELL'?sellStyle:buyStyle}">${c.tradeType}</td><td style="${cell}">${c.strike}</td><td style="${cell}">${c.qty}</td><td style="${cell}">${c.ltp}</td><td style="${cell}">${c.exposure.toFixed(2)}</td>`;
            } else {
                tableRows += `<td style="${cell}"></td><td style="${cell}"></td><td style="${cell}"></td><td style="${cell}"></td><td style="${cell}"></td>`;
            }
            tableRows += spacer;
            if (p) {
                tableRows += `<td style="${p.tradeType==='SELL'?sellStyle:buyStyle}">${p.tradeType}</td><td style="${cell}">${p.strike}</td><td style="${cell}">${p.qty}</td><td style="${cell}">${p.ltp}</td><td style="${cell}">${p.exposure.toFixed(2)}</td>`;
            } else {
                tableRows += `<td style="${cell}"></td><td style="${cell}"></td><td style="${cell}"></td><td style="${cell}"></td><td style="${cell}"></td>`;
            }
            tableRows += '</tr>';
        }

        const html = `<html><head><meta charset="UTF-8"></head><body>
            <h3 style="font-family:Arial">${group.name} — Positions Snapshot</h3>
            <table style="border-collapse:collapse;font-family:Arial;font-size:13px;">${tableRows}</table>
        </body></html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${group.name.replace(/\s+/g,'_')}_positions.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Render Groups
    function renderGroups(groups, onComplete) {
        groupsList.innerHTML = '';
        if (groups.length === 0) {
            groupsList.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">No active groups.</div>';
            if (onComplete) onComplete();
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
                        <div>
                            <button class="edit-btn" data-id="${group.id}">Edit</button>
                            <button class="delete-btn" data-id="${group.id}">Delete</button>
                            <button class="download-btn" data-id="${group.id}">&#8595; XLS</button>
                        </div>
                    </div>
                    <div style="font-size:10px; color:#64748b; margin-top:4px;">
                        Legs: ${group.instruments.join(', ')}
                    </div>
                `;
                div.innerHTML = html;
                
                div.querySelector('.edit-btn').addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const targetGroup = groups.find(g => g.id === id);
                    if (!targetGroup) return;
                    
                    document.getElementById('groupName').value = targetGroup.name;
                    document.getElementById('groupTarget').value = targetGroup.target !== null ? targetGroup.target : '';
                    document.getElementById('groupSL').value = targetGroup.stoploss !== null ? targetGroup.stoploss : '';
                    
                    document.querySelectorAll('.pos-checkbox').forEach(cb => {
                        cb.checked = targetGroup.instruments.includes(cb.value);
                    });
                    
                    const btn = document.getElementById('createGroupBtn');
                    btn.textContent = 'Update Group';
                    btn.setAttribute('data-edit-id', id);
                    document.getElementById('cancelEditBtn').classList.remove('hidden');

                    document.getElementById('lblGroupName').textContent = 'New Name';
                    document.getElementById('lblGroupTarget').textContent = 'New TGT';
                    document.getElementById('lblGroupSL').textContent = 'New SL';
                });
                
                div.querySelector('.delete-btn').addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const updated = groups.filter(g => g.id !== id);
                    chrome.storage.local.set({ groups: updated }, () => {
                        renderGroups(updated);
                    });
                });

                div.querySelector('.download-btn').addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const targetGroup = groups.find(g => g.id === id);
                    if (!targetGroup) return;
                    downloadGroupExcel(targetGroup, positions);
                });

                groupsList.appendChild(div);
            });

            if (onComplete) onComplete();
        });
    }

    // Auto-refresh UI every 1.5s — preserve scroll position to avoid jump
    setInterval(() => {
        chrome.storage.local.get(['currentPositions', 'groups'], (res) => {
            if (res.currentPositions) {
                const bodyScroll = document.documentElement.scrollTop || document.body.scrollTop;
                const listScroll = groupsList.scrollTop;
                renderPositions(res.currentPositions || []);
                renderGroups(res.groups || [], () => {
                    document.documentElement.scrollTop = bodyScroll;
                    document.body.scrollTop = bodyScroll;
                    groupsList.scrollTop = listScroll;
                });
            }
        });
    }, 1500);
});
