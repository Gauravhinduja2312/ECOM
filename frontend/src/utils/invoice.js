import jsPDF from 'jspdf';

export function downloadInvoice(order, items, customerEmail) {
  const pdf = new jsPDF();
  pdf.setFontSize(16);
  pdf.text('Student Marketplace Invoice', 20, 20);

  pdf.setFontSize(11);
  pdf.text(`Order ID: ${order.id}`, 20, 35);
  pdf.text(`Status: ${order.status}`, 20, 42);
  pdf.text(`Customer: ${customerEmail}`, 20, 49);
  pdf.text(`Date: ${new Date(order.created_at).toLocaleString()}`, 20, 56);

  let y = 70;
  items.forEach((item, index) => {
    const line = `${index + 1}. ${item.name} x ${item.quantity} = ₹${(
      Number(item.price) * Number(item.quantity)
    ).toFixed(2)}`;
    pdf.text(line, 20, y);
    y += 8;
  });

  pdf.setFontSize(13);
  pdf.text(`Total: ₹${Number(order.total_price).toFixed(2)}`, 20, y + 10);

  pdf.save(`invoice-${order.id}.pdf`);
}
