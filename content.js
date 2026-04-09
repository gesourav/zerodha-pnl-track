// content.js
console.log("Zerodha P&L Sentinel Content Script Injected!");

function parsePositions() {
    const tableRows = document.querySelectorAll('table tbody tr');
    const positions = [];
    
    tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) { 
            let isNfo = false;
            let instrumentNameStr = '';
            
            cells.forEach((cell, index) => {
                const text = cell.innerText.trim();
                if (text.includes('NFO') || text.includes('BFO')) {
                    isNfo = true;
                    instrumentNameStr = text.replace('\n', ' ');
                }
            });
            
            if (isNfo) {
                // Find index of NFO/BFO string cell to relative match Qty and PNL
                const nfoCellIndex = Array.from(cells).findIndex(c => c.innerText.includes('NFO') || c.innerText.includes('BFO'));
                
                if (nfoCellIndex !== -1 && cells.length > nfoCellIndex + 3) {
                    const qtyStr = cells[nfoCellIndex + 1].innerText.replace(/,/g, '');
                    const qty = parseInt(qtyStr, 10);
                    
                    const avgStr = cells[nfoCellIndex + 2].innerText.replace(/,/g, '');
                    const ltpStr = cells[nfoCellIndex + 3].innerText.replace(/,/g, '');
                    
                    // P&L might be the next cell or the one after depending on if Avg/LTP is combined
                    const pnlStr = cells[nfoCellIndex + 4].innerText.replace(/,/g, '');
                    let pnl = parseFloat(pnlStr);
                    
                    if(isNaN(pnl) && cells.length > nfoCellIndex + 5) {
                         pnl = parseFloat(cells[nfoCellIndex + 5].innerText.replace(/,/g, ''));
                    }

                    positions.push({
                        instrument: instrumentNameStr,
                        qty: isNaN(qty) ? 0 : qty,
                        pnl: isNaN(pnl) ? 0 : pnl
                    });
                }
            }
        }
    });

    if (positions.length > 0) {
        chrome.runtime.sendMessage({
            type: "UPDATE_POSITIONS",
            positions: positions
        }).catch(() => {
           // Ignore connection resets during extension reload
        });
    }
}

// Poll every 2 seconds
setInterval(parsePositions, 500);
