const { supabaseAdmin } = require('./supabaseAdmin');

let io;

function initSocketService(socketIoInstance) {
  io = socketIoInstance;

  io.on('connection', async (socket) => {
    const { userId, role } = socket.handshake.query;

    console.log(`User connected: ${userId} (${role})`);

    // Standard Room: All users join their own private room for direct notifications
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Role-based rooms
    if (role === 'admin') {
      socket.join('admins');
    }

    // Join specific support ticket rooms
    socket.on('join_ticket', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`Socket ${socket.id} joined ticket room: ${ticketId}`);
    });

    // Handle incoming messages
    socket.on('send_message', async (data) => {
      const { ticketId, senderId, message } = data;

      try {
        // 1. Persist to DB
        const { data: newMessage, error } = await supabaseAdmin
          .from('ticket_messages')
          .insert({
            ticket_id: ticketId,
            sender_id: senderId,
            message: message
          })
          .select('*, sender:sender_id(email)')
          .single();

        if (error) throw error;

        // 2. Broadcast to the ticket room
        io.to(`ticket:${ticketId}`).emit('new_message', newMessage);
        
        // 3. Notify admins if a student sent it
        if (role !== 'admin') {
          io.to('admins').emit('admin_notification', {
            type: 'new_support_message',
            ticketId,
            message: 'New message from student'
          });
        }
      } catch (err) {
        console.error('Socket Message Error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

function notifyUser(userId, type, data) {
  if (io) {
    io.to(`user:${userId}`).emit('notification', { type, ...data });
  }
}

module.exports = {
  initSocketService,
  notifyUser
};
