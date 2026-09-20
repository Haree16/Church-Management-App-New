import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('./scratch/db_dump.json', 'utf8'));

const users = dump.users;
const members = dump.members;
const ministries = dump.ministries;

const harrisUser = users.find(u => u.username === 'harris');
const harrisMember = members.find(m => m.firstName.toLowerCase() === 'harris');
const techMinistry = ministries.find(m => m.name.toLowerCase().includes('tech'));

console.log("Harris User:", harrisUser);
console.log("Harris Member:", harrisMember);
console.log("Tech & Media Ministry:", techMinistry);

function checkCanManage(user, member, min) {
  const isSuperOrPastor = ['SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(user.role);
  if (isSuperOrPastor) return { allowed: true, reason: 'Super/Pastor Admin' };

  if (!min || !user) return { allowed: false, reason: 'No min or user' };

  const userName = (user.name || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  const userPhone = (user.phone || '').replace(/\D/g, '').slice(-10);

  // 1. Is user linked to leaderMemberId or assistantLeaderMemberId?
  if (member) {
    if (min.leaderMemberId && member.id === min.leaderMemberId) return { allowed: true, reason: 'leaderMemberId match' };
    if (min.assistantLeaderMemberId && member.id === min.assistantLeaderMemberId) return { allowed: true, reason: 'assistantLeaderMemberId match' };
  }

  // 2. Is leaderName, contactEmail, contactPhone matching currentUser?
  const minLeader = (min.leaderName || '').trim().toLowerCase();
  const minContactEmail = (min.contactEmail || '').trim().toLowerCase();
  const minContactPhone = (min.contactPhone || '').replace(/\D/g, '').slice(-10);

  if (minLeader && userName && (minLeader === userName || minLeader.includes(userName) || userName.includes(minLeader))) {
    return { allowed: true, reason: 'leaderName match' };
  }
  if (minContactEmail && userEmail && minContactEmail === userEmail) {
    return { allowed: true, reason: 'contactEmail match' };
  }
  if (minContactPhone && userPhone && minContactPhone === userPhone) {
    return { allowed: true, reason: 'contactPhone match' };
  }

  return { allowed: false, reason: 'Not a leader of this ministry' };
}

console.log("\nPermission result for Harris in Tech & Media:", checkCanManage(harrisUser, harrisMember, techMinistry));
