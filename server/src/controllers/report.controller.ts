import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@beverly-pms/shared';
import { ReportService } from '../services/report.service';

const getReportContext = (req: Request) => {
  const hotelId = req.user?.role === UserRole.SUPER_ADMIN && req.query.hotel_id 
    ? parseInt(req.query.hotel_id as string) 
    : req.user!.hotel_id;
  return { 
    hotelId: hotelId as number, 
    from: (req.query.date_from as string) || '2000-01-01', 
    to: (req.query.date_to as string) || '2099-12-31' 
  };
};

export const getSalesSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReportService.getSalesSummary(getReportContext(req));
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getOccupancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReportService.getOccupancy(getReportContext(req));
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReportService.getPayments(getReportContext(req));
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getReservationSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReportService.getReservationSummary(getReportContext(req));
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getTopRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReportService.getTopRooms(getReportContext(req));
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
