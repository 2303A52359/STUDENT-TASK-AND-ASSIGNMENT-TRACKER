const { getRecentNotificationsForUser } = require("../services/notificationService");

const setLocals = async (req, res, next) => {
  try {
    res.locals.currentUser = req.session.user || null;
    res.locals.currentPath = req.originalUrl || req.path;
    res.locals.successMessages = req.flash("success");
    res.locals.errorMessages = req.flash("error");
    res.locals.notifications = [];
    res.locals.unreadNotificationCount = 0;

    if (req.session.user && req.session.user.id) {
      const notificationState = await getRecentNotificationsForUser(req.session.user.id);
      res.locals.notifications = notificationState.notifications;
      res.locals.unreadNotificationCount = notificationState.unreadCount;
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = setLocals;
