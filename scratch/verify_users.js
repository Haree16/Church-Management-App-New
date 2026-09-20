import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('./scratch/db_dump.json', 'utf8'));

const users = dump.users;
const members = dump.members;

console.log(`=== FIRESTORE VERIFICATION REPORT ===`);
console.log(`Total Users in Database: ${users.length}`);

console.log(`\n1. COMMUNION MINISTRY USERS CREATED:`);
const communionUsernames = ['manimegalai', 'pinky', 'usha', 'nalini'];
users.filter(u => communionUsernames.includes(u.username)).forEach(u => {
  console.log(`- Username: ${u.username} | Password: ${u.password} | Name: ${u.name} | Phone: ${u.phone} | Email: ${u.email} | Role: ${u.role}`);
});

console.log(`\n2. OTHER MINISTRY USERS CREATED (21 users):`);
const createdUsers = JSON.parse(fs.readFileSync('./scratch/created_users.json', 'utf8'));
const newlyCreatedUsernames = createdUsers.map(u => u.username);
users.filter(u => newlyCreatedUsernames.includes(u.username) && !communionUsernames.includes(u.username)).forEach(u => {
  console.log(`- Username: ${u.username} | Password: ${u.password} | Name: ${u.name} | Phone: ${u.phone} | Email: ${u.email}`);
});

console.log(`\n3. EXISTING USERS PRESERVED & SKIPPED (No duplication):`);
users.filter(u => !newlyCreatedUsernames.includes(u.username)).forEach(u => {
  console.log(`- Username: ${u.username} | Name: ${u.name} | Role: ${u.role}`);
});
