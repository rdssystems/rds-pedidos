export const printPedido = (pedido: any, storeName?: string) => {
    const getItemName = (item: any): string =>
        item.produto_obj?.nome || item.produto_nome || item.nome || '—';

    const html = `<html><head><title>Comanda #${pedido.numero_diario || pedido.id}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact}
  @page{margin:0!important;padding:0!important;size:auto}
  html,body{height:auto!important;min-height:0!important;margin:0!important;padding:0!important;background:#fff;overflow:visible!important;position:relative}
  body{font-family:'Courier New',monospace;width:72mm!important;color:#000;display:block!important;overflow:visible!important}
  .wrapper{width:100%;display:block!important;position:absolute!important;top:0!important;left:0!important;padding:0 2mm}
  .brand{text-align:center;padding-top:1mm;padding-bottom:3mm;margin-bottom:3mm;border-bottom:2px solid #000}
  .store-title{font-size:20px;font-weight:900;text-transform:uppercase;margin-bottom:1mm;letter-spacing:1px}
  .order-id{font-size:22px;font-weight:bold;text-align:center;margin:3mm 0 1mm}
  .datetime{text-align:center;font-size:10px;color:#000;font-weight:bold;margin-bottom:3mm}
  .divider{border:none;border-top:1px dashed #000;margin:2mm 0}
  .info{font-size:12px;margin-bottom:1mm;font-weight:bold}
  .section-title{font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#000;margin:2mm 0 1mm;border-bottom:1px solid #000;padding-bottom:0.5mm}
  .row{display:flex;justify-content:space-between;margin-bottom:1.5mm;font-size:12px;font-weight:bold}
  .total{border-top:2px solid #000;padding-top:2mm;margin-top:3mm;font-weight:900;font-size:15px;display:flex;justify-content:space-between}
  .foot{text-align:center;margin-top:6mm;padding-bottom:12mm;font-size:9px;color:#000;font-weight:bold;letter-spacing:0.5px;line-height:1.4}
  .foot strong{color:#000;font-size:11px;font-weight:900}
  .sys-tag{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#000;margin-top:4px;font-weight:900}
</style></head><body><div class="wrapper">
<div class="brand">
  <div class="store-title">${(storeName || 'LOJA').toUpperCase()}</div>
</div>

<div class="order-id">COMANDA #${pedido.numero_diario || pedido.id}</div>
<div class="datetime">${new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>

<div class="section-title">Cliente</div>
<div class="info">${pedido.cliente_nome}</div>
${pedido.cliente_whatsapp ? `<div class="info">📞 ${pedido.cliente_whatsapp}</div>` : ''}

<div class="section-title">Pedido</div>
<div class="info">Tipo: ${pedido.tipo === 'ENTREGA' ? '🛵 Entrega' : '🏪 Retirada'} | Pgto: ${pedido.forma_pagamento}</div>
${pedido.endereco ? `<div class="info">📍 ${pedido.endereco}</div>` : ''}

<hr class="divider"/>
<div class="section-title">Itens</div>
${(pedido.itens ?? []).map((i: any) => {
    const selecoesStr = (i.selecoes ?? []).map((s: any) => s.opcao).join(', ');
    return `<div class="row">
      <span>
        ${i.quantidade}x ${getItemName(i)}
        ${selecoesStr ? `<br/><small style="color:#666;margin-left:4mm">• ${selecoesStr}</small>` : ''}
        ${i.observacoes ? `<br/><small style="color:#666;margin-left:4mm">Obs: ${i.observacoes}</small>` : ''}
      </span>
      <span>R$ ${parseFloat(i.preco_unitario).toFixed(2)}</span>
    </div>`;
}).join('')}

<div class="total"><span>TOTAL</span><span>R$ ${parseFloat(pedido.total).toFixed(2)}</span></div>

<div class="foot">
  Obrigado pela preferência! ☺<br/>
  <strong>rDs Pedidos</strong> — rdspedidos.com.br<br/>
  <div class="sys-tag">Sistema de Gestão de Pedidos</div>
</div>
</div>
</body></html>`;

    // --- STRATEGY: ELECTRON DIRECT PRINT ---
    if ((window as any).electron?.isElectron) {
        const selectedPrinter = localStorage.getItem('selectedPrinter') || '';
        (window as any).electron.printPedido(html, selectedPrinter)
            .catch((err: any) => console.error('Silent print failed:', err));
        return;
    }

    // --- STRATEGY: BROWSER PRINT DIALOG ---
    const iframe = document.createElement('iframe');
    // Keep it slightly visible but non-intrusive for better browser support
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    
    doc.open();
    doc.write(html);
    doc.close();
    
    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 3000);
    }, 1000);
};
