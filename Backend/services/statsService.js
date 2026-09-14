const User = require('../models/User');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');

function shiftCalendarDay(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return date.toISOString().split('T')[0];
}

async function getUserStats(userId = null, tzOffsetMinutes = 0) {
  const totalProblems = await Problem.countDocuments();
  const totalUsers = Math.max(await User.countDocuments(), 1);

  if (!userId) {
    return {
      problemsAvailable: totalProblems,
      currentStreak: 0,
      streakText: '0 Days',
      ranking: 'Top 0%',
      rank: null,
      solvedCount: 0,
      totalUsers
    };
  }

  // 1. Leaderboard Ranking
  const userSolves = await Submission.aggregate([
    { $match: { status: 'accepted' } },
    {
      $group: {
        _id: '$userId',
        uniqueProblems: { $addToSet: '$problemId' },
        totalAccepted: { $sum: 1 },
        lastAccepted: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        userId: '$_id',
        solvedCount: { $size: '$uniqueProblems' },
        totalAccepted: 1,
        lastAccepted: 1
      }
    },
    {
      $sort: {
        solvedCount: -1,
        totalAccepted: -1,
        lastAccepted: 1
      }
    }
  ]);

  const userEntryIndex = userSolves.findIndex(u => u.userId.toString() === userId.toString());
  const userSolveData = userEntryIndex !== -1 ? userSolves[userEntryIndex] : null;
  const solvedCount = userSolveData ? userSolveData.solvedCount : 0;
  const userRank = userEntryIndex !== -1 ? userEntryIndex + 1 : totalUsers;

  let rankingText = 'Top 0%';
  if (solvedCount > 0) {
    if (totalUsers <= 1 || userRank === 1) {
      rankingText = 'Top 1%';
    } else {
      const percentile = Math.max(1, Math.min(100, Math.round((userRank / totalUsers) * 100)));
      rankingText = `Top ${percentile}%`;
    }
  }

  // 2. Current Streak
  const acceptedSubs = await Submission.find({
    userId,
    status: 'accepted'
  }).select('createdAt').sort({ createdAt: -1 });

  const getLocalDateStr = (dateObj) => {
    const ms = dateObj.getTime() - (tzOffsetMinutes * 60 * 1000);
    return new Date(ms).toISOString().split('T')[0];
  };

  const activeDays = new Set();
  acceptedSubs.forEach(s => {
    activeDays.add(getLocalDateStr(new Date(s.createdAt)));
  });

  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const yesterdayStr = shiftCalendarDay(todayStr, -1);

  let streak = 0;
  if (activeDays.has(todayStr)) {
    let curr = todayStr;
    while (activeDays.has(curr)) {
      streak++;
      curr = shiftCalendarDay(curr, -1);
    }
  } else if (activeDays.has(yesterdayStr)) {
    let curr = yesterdayStr;
    while (activeDays.has(curr)) {
      streak++;
      curr = shiftCalendarDay(curr, -1);
    }
  }

  const streakText = streak === 1 ? '1 Day' : `${streak} Days`;

  return {
    problemsAvailable: totalProblems,
    currentStreak: streak,
    streakText,
    ranking: rankingText,
    rank: solvedCount > 0 ? userRank : null,
    totalUsers,
    solvedCount
  };
}

module.exports = {
  getUserStats,
  shiftCalendarDay
};
