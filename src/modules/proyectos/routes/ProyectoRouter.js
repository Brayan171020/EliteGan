import { Router } from "express";
import ProyectoController  from "../controllers/ProyectoController.js";
import { validateSchema } from "../../../middlewares/ValidatorSchema.js";
import { createEschema } from "../schemas/ProyectoEschema.js";

const ProyectoRouter = Router()

// Endpoints
ProyectoRouter.get('/todos', ProyectoController.index)
ProyectoRouter.get('/seleccionar/:id', ProyectoController.getById)
ProyectoRouter.get('/usuario/:id', ProyectoController.getByUser)
ProyectoRouter.post('/crear', validateSchema(createEschema), ProyectoController.create)
// ProyectoRouter.post('/actualizar/:id', /*validateSchema(updateEschema)*/ ProyectoController.update)
ProyectoRouter.delete('/eliminar/:id', ProyectoController.delete)

//ProyectoRouter.get('/reporte/:id', pdf)
//ProyectoRouter.get('/Graficaproyecto/:id', ProyectoController.graph)
ProyectoRouter.get('/:id/pdf', ProyectoController.generarPDFProyectoSimple)

export default ProyectoRouter