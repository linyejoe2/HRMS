import { Router } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { getPublicLeaveRecords } from '../controllers/publicController';
import { authenticatePublicApiKey } from '../middleware/auth';
import { validateRequest, publicLeaveRecordsSchema } from '../middleware/validation';
import publicLeaveApiSpec from '../openapi/publicLeaveApi.json';

const router = Router();

// API documentation (no auth - this is just the spec/UI, not the data).
// The app-wide helmet() CSP blocks Swagger UI's inline scripts/styles, so it's
// disabled again here, scoped to this route only.
router.use('/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(publicLeaveApiSpec));

router.post(
  '/leave/records/:empID',
  authenticatePublicApiKey,
  validateRequest(publicLeaveRecordsSchema),
  getPublicLeaveRecords
);

export default router;
