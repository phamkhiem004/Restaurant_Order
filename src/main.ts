function bootstrap(): never {
  throw new Error(
    'This application uses Cloudflare D1. Run it with `npm run dev:worker`.',
  );
}

bootstrap();
