import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import clustersRouter from "./clusters";
import servicesRouter from "./services";
import usersRouter from "./users";
import rolesRouter from "./roles";
import auditRouter from "./audit";
import sparkClustersRouter from "./spark-cluster.routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(clustersRouter);
router.use(servicesRouter);
router.use(usersRouter);
router.use(rolesRouter);
router.use(auditRouter);
router.use("/spark-clusters", sparkClustersRouter);

export default router;
