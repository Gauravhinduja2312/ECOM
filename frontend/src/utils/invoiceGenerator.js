import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generateAndDownloadInvoice(order, orderItems = []) {
  try {
    const invoiceElement = document.createElement('div');
    invoiceElement.style.position = 'absolute';
    invoiceElement.style.left = '-9999px';
    invoiceElement.style.padding = '40px';
    invoiceElement.style.width = '800px';
    invoiceElement.style.backgroundColor = 'white';
    invoiceElement.style.fontFamily = 'Arial, sans-serif';

    const today = new Date();
    const invoiceDate = today.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    invoiceElement.innerHTML = `
      <div style="margin-bottom: 30px;">
        <h1 style="margin: 0; color: #1e293b; font-size: 28px;">📄 INVOICE</h1>
        <p style="margin: 5px 0; color: #64748b; font-size: 12px;">Student Marketplace</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
        <div>
          <p style="margin: 0; color: #475569; font-weight: bold;">Invoice Details</p>
          <p style="margin: 5px 0; font-size: 12px; color: #64748b;">Invoice #: ${order.id}</p>
          <p style="margin: 5px 0; font-size: 12px; color: #64748b;">Date: ${invoiceDate}</p>
          <p style="margin: 5px 0; font-size: 12px; color: #64748b;">Status: <span style="text-transform: capitalize; font-weight: bold;">${order.status}</span></p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #475569; font-weight: bold;">Student Marketplace</p>
          <p style="margin: 5px 0; font-size: 12px; color: #64748b;">Email: support@studentmarketplace.com</p>
          <p style="margin: 5px 0; font-size: 12px; color: #64748b;">Phone: +91-XXXXXXXXXX</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 12px; text-align: left; font-weight: bold; color: #1e293b;">Product</th>
            <th style="padding: 12px; text-align: center; font-weight: bold; color: #1e293b;">Qty</th>
            <th style="padding: 12px; text-align: right; font-weight: bold; color: #1e293b;">Price</th>
            <th style="padding: 12px; text-align: right; font-weight: bold; color: #1e293b;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${orderItems.length > 0 
            ? orderItems.map((item) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; color: #334155;">${item.product_name || 'Product'}</td>
                <td style="padding: 12px; text-align: center; color: #334155;">${item.quantity || 1}</td>
                <td style="padding: 12px; text-align: right; color: #334155;">₹${(item.price || 0).toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #1e293b;">₹${(item.quantity * item.price || 0).toFixed(2)}</td>
              </tr>
            `).join('')
            : '<tr style="border-bottom: 1px solid #e2e8f0;"><td colspan="4" style="padding: 12px; text-align: center; color: #64748b;">No items details available</td></tr>'
          }
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b;">Subtotal:</span>
            <span style="color: #334155;">₹${(order.total_price || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; background-color: #f1f5f9; padding: 12px; border-radius: 4px;">
            <span style="font-weight: bold; color: #1e293b;">Total Amount:</span>
            <span style="font-weight: bold; color: #2563eb; font-size: 16px;">₹${(order.total_price || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
        <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">
          This is an auto-generated invoice. Thank you for your purchase!
        </p>
        <p style="margin: 5px 0; color: #64748b; font-size: 11px; text-align: center;">
          For support, please contact support@studentmarketplace.com
        </p>
      </div>
    `;

    document.body.appendChild(invoiceElement);

    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth - 20;
    const imgHeight = (canvas.height / canvas.width) * imgWidth;

    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save(`invoice-${order.id}.pdf`);

    document.body.removeChild(invoiceElement);
  } catch (error) {
    console.error('Error generating invoice:', error);
    alert('Failed to generate invoice: ' + error.message);
  }
}
