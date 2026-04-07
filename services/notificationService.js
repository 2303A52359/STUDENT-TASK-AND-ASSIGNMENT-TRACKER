const Notification = require("../models/Notification");
const User = require("../models/User");

const toObjectIdValue = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value._id || value.id || null;
};

const createNotification = async ({ recipient, sender, task, type, title, message, link }) => {
  if (!recipient) {
    return null;
  }

  return Notification.create({
    recipient: toObjectIdValue(recipient),
    sender: toObjectIdValue(sender),
    task: toObjectIdValue(task),
    type,
    title,
    message,
    link: link || ""
  });
};

const notifyTaskAssigned = async ({ task, actor, actorName, recipient, itemLabel, link }) =>
  createNotification({
    recipient,
    sender: actor,
    task,
    type: task.itemCategory === "assignment" ? "assignment_assigned" : "task_assigned",
    title: `New ${itemLabel} assigned`,
    message: `${actorName || "Admin"} assigned "${task.title}" to you.`,
    link
  });

const notifyAdminsOfSubmission = async ({ task, actor, actorName, itemLabel, link }) => {
  const admins = await User.find({ role: "admin" }).select("_id").lean();

  if (!admins.length) {
    return [];
  }

  return Notification.insertMany(
    admins.map((admin) => ({
      recipient: admin._id,
      sender: toObjectIdValue(actor),
      task: toObjectIdValue(task),
      type: task.itemCategory === "assignment" ? "assignment_submitted" : "task_submitted",
      title: `${itemLabel} submitted`,
      message: `${actorName || "User"} submitted "${task.title}".`,
      link
    }))
  );
};

const getRecentNotificationsForUser = async (userId, limit = 5) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: userId, readAt: null })
  ]);

  const unreadNotificationIds = notifications
    .filter((notification) => !notification.readAt)
    .map((notification) => notification._id);

  if (unreadNotificationIds.length) {
    const viewedAt = new Date();

    await Notification.updateMany(
      { _id: { $in: unreadNotificationIds }, readAt: null },
      { $set: { readAt: viewedAt } }
    );

    notifications.forEach((notification) => {
      if (!notification.readAt) {
        notification.readAt = viewedAt;
      }
    });
  }

  return {
    notifications,
    unreadCount
  };
};

module.exports = {
  createNotification,
  getRecentNotificationsForUser,
  notifyAdminsOfSubmission,
  notifyTaskAssigned
};
