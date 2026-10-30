/** Usage: npm run create-admin -- you@domain.lk "Your Name" "a-strong-password" */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password || password.length < 10) {
  console.error('Usage: npm run create-admin -- <email> "<name>" "<password, 10+ chars>"');
  process.exit(1);
}

const prisma = new PrismaClient();
prisma.staffUser
  .upsert({
    where: { email: email.toLowerCase() },
    update: { name, passwordHash: bcrypt.hashSync(password, 10), role: "ADMIN", active: true },
    create: { email: email.toLowerCase(), name, passwordHash: bcrypt.hashSync(password, 10), role: "ADMIN" },
  })
  .then((u) => console.log(`Admin ready: ${u.email}`))
  .finally(() => prisma.$disconnect());
