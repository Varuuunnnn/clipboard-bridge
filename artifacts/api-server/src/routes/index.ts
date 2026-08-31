import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clipboardRouter from "./clipboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clipboardRouter);

export default router;
