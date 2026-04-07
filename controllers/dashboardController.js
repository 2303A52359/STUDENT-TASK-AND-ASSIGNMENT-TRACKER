const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const priorityOrder = ["High", "Medium", "Low"];

const mapMonths = (itemsByMonth) =>
  monthLabels.map((label, index) => {
    const match = itemsByMonth.find((item) => item._id === index + 1);
    return match ? match.count : 0;
  });

const mapPriorities = (itemsByPriority) =>
  priorityOrder.map((priority) => {
    const match = itemsByPriority.find((item) => item._id === priority);
    return match ? match.count : 0;
  });

const buildUserVisibilityQuery = (userId) => ({
  $or: [
    { assignedTo: new mongoose.Types.ObjectId(userId) },
    { createdBy: new mongoose.Types.ObjectId(userId), assignedTo: null }
  ]
});

const getUserDashboardData = async (userId) => {
  const ownerId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const visibilityQuery = buildUserVisibilityQuery(userId);

  const taskFilter = {
    itemCategory: "task",
    ...visibilityQuery
  };

  const assignmentFilter = {
    itemCategory: "assignment",
    ...visibilityQuery
  };

  const allItemsFilter = {
    itemCategory: { $in: ["task", "assignment"] },
    ...visibilityQuery
  };

  const aggregateBase = [
    {
      $match: {
        itemCategory: { $in: ["task", "assignment"] },
        $or: [
          { assignedTo: ownerId },
          { createdBy: ownerId, assignedTo: null }
        ]
      }
    }
  ];

  const [
    totalItems,
    totalTasks,
    totalAssignments,
    completedTasks,
    pendingTasks,
    overdueItems,
    dueTodayItems,
    completedAssignments,
    pendingAssignments,
    itemsByMonth,
    itemsByPriority,
    upcomingTasks,
    upcomingAssignments
  ] = await Promise.all([
    Task.countDocuments(allItemsFilter),
    Task.countDocuments(taskFilter),
    Task.countDocuments(assignmentFilter),
    Task.countDocuments({ ...taskFilter, completed: true }),
    Task.countDocuments({ ...taskFilter, completed: false }),
    Task.countDocuments({ ...allItemsFilter, completed: false, deadline: { $lt: now } }),
    Task.countDocuments({
      ...allItemsFilter,
      deadline: {
        $gte: startOfToday,
        $lt: endOfToday
      }
    }),
    Task.countDocuments({ ...assignmentFilter, completed: true }),
    Task.countDocuments({ ...assignmentFilter, completed: false }),
    Task.aggregate([
      ...aggregateBase,
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Task.aggregate([
      ...aggregateBase,
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }
      }
    ]),
    Task.find({
      ...taskFilter,
      completed: false,
      deadline: { $gte: now }
    })
      .sort({ deadline: 1 })
      .limit(5)
      .lean(),
    Task.find({
      ...assignmentFilter,
      completed: false,
      deadline: { $gte: now }
    })
      .sort({ deadline: 1 })
      .limit(5)
      .lean()
  ]);

  return {
    view: "dashboard/user",
    title: "Dashboard",
    stats: {
      totalItems,
      totalTasks,
      totalAssignments,
      completedTasks,
      pendingTasks,
      overdueItems,
      dueTodayItems,
      completedAssignments,
      pendingAssignments
    },
    chartData: {
      monthLabels,
      tasksPerMonth: mapMonths(itemsByMonth),
      priorityLabels: priorityOrder,
      tasksPerPriority: mapPriorities(itemsByPriority)
    },
    trackers: {
      upcomingTasks,
      upcomingAssignments
    }
  };
};

const getAdminDashboardData = async () => {
  const now = new Date();

  const [
    totalUsers,
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    tasksByMonth,
    tasksByPriority,
    upcomingTasks,
    recentUsers
  ] = await Promise.all([
    User.countDocuments(),
    Task.countDocuments(),
    Task.countDocuments({ completed: true }),
    Task.countDocuments({ completed: false }),
    Task.countDocuments({ completed: false, deadline: { $lt: now } }),
    Task.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }
      }
    ]),
    Task.find({ completed: false })
      .populate("createdBy", "name email")
      .sort({ deadline: 1 })
      .limit(5)
      .lean(),
    User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  ]);

  return {
    view: "dashboard/admin",
    title: "Admin Dashboard",
    stats: {
      totalUsers,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks
    },
    chartData: {
      monthLabels,
      tasksPerMonth: mapMonths(tasksByMonth),
      priorityLabels: priorityOrder,
      tasksPerPriority: mapPriorities(tasksByPriority)
    },
    trackers: {
      upcomingTasks,
      recentUsers
    }
  };
};

const getDashboard = async (req, res, next) => {
  try {
    const isAdmin = req.session.user && req.session.user.role === "admin";
    const dashboardData = isAdmin
      ? await getAdminDashboardData()
      : await getUserDashboardData(req.session.user.id);

    res.render(dashboardData.view, dashboardData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard
};
