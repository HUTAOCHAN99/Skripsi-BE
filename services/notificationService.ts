import { Server } from 'socket.io';
import redisClient from '../config/redis';

// Deklarasi io dari app
let io: Server;

export const setIo = (ioInstance: Server) => {
  io = ioInstance;
};

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  data?: any;
  createdAt: Date;
  read: boolean;
}

export const sendNotification = async (userId: string, notification: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'read'>) => {
  const id = Date.now().toString();
  
  // Perbaiki: jangan spread notification karena akan overwrite userId
  const newNotification: Notification = {
    id,
    userId,  // Assign userId langsung
    title: notification.title,
    message: notification.message,
    type: notification.type,
    data: notification.data,
    createdAt: new Date(),
    read: false
  };
  
  // Simpan ke Redis
  const key = `notifications:${userId}`;
  await redisClient.lPush(key, JSON.stringify(newNotification));
  await redisClient.lTrim(key, 0, 49);
  
  // Kirim via Socket.IO jika io sudah diinisialisasi
  if (io) {
    io.to(userId).emit('new-notification', newNotification);
  }
  
  return newNotification;
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const key = `notifications:${userId}`;
  const notifications = await redisClient.lRange(key, 0, -1);
  return notifications.map(n => JSON.parse(n));
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const key = `notifications:${userId}`;
  const notifications = await redisClient.lRange(key, 0, -1);
  const updated = notifications.map(n => {
    const notif = JSON.parse(n);
    if (notif.id === notificationId) {
      notif.read = true;
    }
    return JSON.stringify(notif);
  });
  
  await redisClient.del(key);
  if (updated.length > 0) {
    await redisClient.rPush(key, updated);
  }
};