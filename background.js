// background.js

let lastAlertTime = {}; // { groupId: timestamp }
const COOLDOWN_MS = 5 * 60 * 1000; // 5 mins

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "UPDATE_POSITIONS") {
        const positions = request.positions;
        
        chrome.storage.local.set({ currentPositions: positions });
        
        chrome.storage.local.get(['groups', 'telegram'], (data) => {
            const groups = data.groups || [];
            const telegram = data.telegram || { botToken: '', chatId: '' };
            
            if (!telegram.botToken || !telegram.chatId) return;

            groups.forEach(group => {
                let groupPnl = 0;
                let totalAbsQty = 0;
                
                group.instruments.forEach(instName => {
                    const pos = positions.find(p => p.instrument === instName);
                    if (pos) {
                        groupPnl += pos.pnl;
                        totalAbsQty += Math.abs(pos.qty);
                    }
                });

                // If fully squared off, don't alert and continue
                if (totalAbsQty === 0) return;

                let alertTriggered = false;
                let alertMessage = "";

                if (group.target !== null && groupPnl >= group.target) {
                    alertTriggered = true;
                    alertMessage = `🟢 TARGET REACHED!\nGroup: ${group.name}\nTarget: ₹${group.target}\nCurrent P&L: ₹${groupPnl.toFixed(2)}`;
                } else if (group.stoploss !== null && groupPnl <= group.stoploss) {
                    alertTriggered = true;
                    alertMessage = `🔴 STOPLOSS HIT!\nGroup: ${group.name}\nStopLoss: ₹${group.stoploss}\nCurrent P&L: ₹${groupPnl.toFixed(2)}`;
                }

                if (alertTriggered) {
                    const now = Date.now();
                    const lastTime = lastAlertTime[group.id] || 0;
                    
                    if (now - lastTime >= COOLDOWN_MS) {
                        sendTelegramAlert(telegram.botToken, telegram.chatId, alertMessage);
                        lastAlertTime[group.id] = now;
                    }
                }
            });
        });
    }
});

function sendTelegramAlert(token, chatId, text) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        })
    }).catch(console.error);
}
