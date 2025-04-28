import bcrypt from 'bcryptjs';
import prisma from '../../../../lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, firstName, lastName, birthDate, address, password, isSignUp } = body;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Имейл и парола са задължителни.' }), { status: 400 });
  }

  if (isSignUp) {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return new Response(JSON.stringify({ error: 'Потребителят вече съществува.' }), { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

    return new Response(JSON.stringify({ message: 'Регистрацията е успешна!' }), { status: 200 });
  } else {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'Невалиден имейл или парола.' }), { status: 400 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return new Response(JSON.stringify({ error: 'Невалиден имейл или парола.' }), { status: 400 });
    }

    return new Response(JSON.stringify({ message: 'Входът е успешен!' }), { status: 200 });
  }
}