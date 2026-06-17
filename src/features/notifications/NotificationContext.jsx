"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

const initialMockNotifications = [
  {
    id: "1",
    category: "Streak",
    title: "🔥 7 Day Streak Achieved",
    message: "You've practiced for 7 days in a row. Keep it up!",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    read: false,
    priority: "high",
    actionUrl: "/arena",
  },
  {
    id: "2",
    category: "Achievement",
    title: "🏆 Achievement Unlocked",
    message: "You have completed 50 algorithms! You earned the 'Algorithmic Master' badge.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
    priority: "high",
    actionUrl: "/dashboard",
  },
  {
    id: "3",
    category: "Practice",
    title: "📝 Daily Practice Challenge",
    message: "New dynamic programming challenges have been added to your curriculum.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    priority: "medium",
    actionUrl: "/practice",
  },
  {
    id: "4",
    category: "Blog",
    title: "📚 New Blog Available",
    message: "Check out our latest post: 'Understanding Graphs and Tree Traversals'.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    read: true,
    priority: "low",
    actionUrl: "/blog",
  },
  {
    id: "5",
    category: "System",
    title: "🎯 Goal Completed",
    message: "You successfully completed your weekly target of 10 problems.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    read: true,
    priority: "medium",
    actionUrl: "/dashboard",
  },
  {
    id: "6",
    category: "Community",
    title: "💬 New Reply",
    message: "Someone replied to your comment in the 'Two Sum' discussion.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4 days ago
    read: true,
    priority: "low",
    actionUrl: "/community",
  },
  {
    id: "7",
    category: "Announcement",
    title: "🚀 Platform Update",
    message: "AlgoBuddy v2.0 is live! Explore the new notification panel and more.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
    read: false,
    priority: "high",
    actionUrl: "/",
  }
];

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("algobuddy_notifications");
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications(initialMockNotifications);
      }
    } catch (e) {
      console.error("Error loading notifications:", e);
      setNotifications(initialMockNotifications);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem("algobuddy_notifications", JSON.stringify(notifications));
      } catch (e) {
        console.error("Error saving notifications:", e);
      }
    }
  }, [notifications, mounted]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem("algobuddy_notifications");
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
