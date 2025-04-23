
import bcrypt from 'bcryptjs';
// import { PrismaClient } from '@prisma/client';
import prisma from '../../../../lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, firstName, lastName, birthDate, address, password, isSignUp } = body;

  console.log("инфо от АПИ:", body);

  // Проверка дали имейл и парола са подадени
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Имейл и парола са задължителни.' }), { status: 400 });
  }

  if (isSignUp) {
    // Логика за регистрация
    const userExists = await prisma.user.findUnique({
      where: { email }, // Проверка дали съществува потребител с този имейл
    });

    if (userExists) {
      return new Response(JSON.stringify({ error: 'Потребителят вече съществува.' }), { status: 400 });
    }

    // Хеширане на паролата
    const hashedPassword = await bcrypt.hash(password, 10); // Хеширане на паролата със saltRounds 10

    // Създаване на нов потребител в базата данни
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        birthDate: new Date(birthDate),
        address,
        password: hashedPassword,
      },
    });

    return new Response(JSON.stringify({}), { status: 200 });
  } else {
    // Логика за вход
    const user = await prisma.user.findUnique({
      where: { email }, // Търсене на потребител с този имейл
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'Невалиден имейл или парола.' }), { status: 400 });
    }

    // Проверка на паролата
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Login заявка:", { email, password });
    if (!passwordMatch) {
      return new Response(JSON.stringify({ error: 'Невалиден имейл или парола.' }), { status: 400 });
    }

    return new Response(JSON.stringify({ message: 'Входът е успешен!' }), { status: 200 });
  }
}
