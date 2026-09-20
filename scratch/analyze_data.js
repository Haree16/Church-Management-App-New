import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('./scratch/db_dump.json', 'utf8'));

console.log("================ USERS ================");
dump.users.forEach((u, i) => {
  console.log(`${i + 1}. ID: ${u.id} | username: ${u.username} | name: ${u.name} | email: ${u.email} | phone: ${u.phone} | role: ${u.role}`);
});

console.log("\n================ MINISTRIES ================");
dump.ministries.forEach((m, i) => {
  console.log(`${i + 1}. ID: ${m.id} | name: ${m.name} | leaderName: ${m.leaderName}`);
});

console.log("\n================ MEMBERS ================");
dump.members.forEach((m, i) => {
  console.log(`${i + 1}. ID: ${m.id} | Name: ${m.firstName} ${m.lastName} | email: ${m.email} | phone: ${m.phone} | ministryTeams: ${JSON.stringify(m.ministryTeams)}`);
});
