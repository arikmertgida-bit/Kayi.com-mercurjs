import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';

async function addAdminUser() {
  // Bağlantı bilgilerini .env veya config dosyanızdan alın
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'mercurjs',
    entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  await dataSource.initialize();

  const passwordHash = await hash('19791979aa', 10);

  // Kullanıcı tablonuzun adı ve alanları farklıysa burayı güncelleyin
  await dataSource.query(
    `INSERT INTO admin (email, password, role, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (email) DO NOTHING`,
    ['arikmertgida@gmail.com', passwordHash, 'admin']
  );

  await dataSource.destroy();
  console.log('Admin kullanıcı başarıyla eklendi!');
}

addAdminUser().catch((err) => {
  console.error('Hata:', err);
  process.exit(1);
});
