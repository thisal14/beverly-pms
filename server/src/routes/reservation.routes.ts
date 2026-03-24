import { Router } from 'express';
import { createReservation, getReservations, getReservationById, getReservationTimeline } from '../controllers/reservation.controller';
import { checkin } from '../controllers/checkin.controller';
import { checkout } from '../controllers/checkout.controller';
import { addPayment } from '../controllers/payment.controller';
import { authenticateToken, requireHotel } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireHotel);

router.post('/', createReservation);
router.get('/', getReservations);
router.get('/timeline', getReservationTimeline);
router.get('/:id', getReservationById);

router.post('/:id/checkin', checkin);
router.post('/:id/checkout', checkout);
router.post('/:id/payment', addPayment);

export default router;
