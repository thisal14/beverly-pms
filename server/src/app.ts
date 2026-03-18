import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error.middleware';

// Routers
import authRoutes from './routes/auth.routes';
import reservationRoutes from './routes/reservation.routes';
import roomRoutes from './routes/room.routes';
import hotelRoutes from './routes/hotel.routes';
import adminRoutes from './routes/admin.routes';
import reportRoutes from './routes/report.routes';

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api', roomRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

// General Error Handler
app.use(errorHandler);

export default app;
