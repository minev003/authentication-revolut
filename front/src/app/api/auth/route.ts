import bcrypt from 'bcryptjs';
import prisma from '../../../../lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, firstName, lastName, birthDate, address, password, isSignUp } = body;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required.' }), { status: 400 });
  }

  if (isSignUp) {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return new Response(JSON.stringify({ error: 'User already exists.' }), { status: 400 });
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

    return new Response(JSON.stringify({ message: 'Registration successful!' }), { status: 200 });
  } else {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid email or password.' }), { status: 400 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return new Response(JSON.stringify({ error: 'Invalid email or password.' }), { status: 400 });
    }

    return new Response(JSON.stringify({ message: 'Login successful!' }), { status: 200 });
  }
}