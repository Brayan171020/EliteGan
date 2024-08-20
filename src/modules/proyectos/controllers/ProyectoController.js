import { Proyecto } from "../model/ProyectoModel.js";
import { Metricas } from "../../metricas/model/metricasModel.js";
import { user } from "../../usuarios/model/UserModel.js";
import  tarea  from "../../tareas/model/TareaModel.js";
import { ResponsableClienteReplica } from "../../responsables_clientes/model/responsable_clienteModel.js";
import { calcularDiferenciaDeTiempo } from "../../tareas/libs/Tarifa.js";
import date from "date-and-time";
import puppeteer from "puppeteer";
import { Chart } from "chart.js";
import { formatearMinutos, convertirMinutos } from "../libs/pool_horas.js";

class ProyectoController {
  // devuelve todos los registros
  static async index(req, res) {
    try {
      // Buscar todos los registros
      const proyectos = await Proyecto.findAll();
      // si no se encuentran registros en la base de datos
      if (!proyectos) {
        return res
          .status(204)
          .json({ message: "No hay proyectos registrados" });
      }
      // devuelve una respuesta
      res.status(200).json(proyectos);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // devuelve un unico registro segun su primary key
  static async getById(req, res) {
    try {
      // capturar id de proyecto
      const { id } = req.params;
      // buscar el proyecto segun su id junto con los datos de sus modelos asociados
      const proyecto = await Proyecto.findByPk(id);
      // comprobar si existe el proyecto
      if (!proyecto) {
        return res.status(404).json({
          code: "Recurso no encontrado",
          message: "Proyecto no encontrado",
          details:
            "Proyecto con el id " + id + " no se encuentra en la base de datos",
          timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
          requestID: id,
        });
      }
      res.status(200).json(proyecto);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // devuelve los proyectos segun el id usuario
  static async getByUser(req, res) {
    try {
      // capturar id de usuario
      const { id } = req.params;
      // comprobar si existe el usuario
      const userFound = await user.findOneById(id);
      if (!userFound) {
        return res.status(404).json({
          code: "Recurso no encontrado",
          message: "Usuario no encontrado",
          details:
            "Usuario con el id " + id + " no se encuentra en la base de datos",
          timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
          requestID: id,
        });
      }
      // buscar el proyecto segun el id del usuario
      const proyectos = await Proyecto.findByUser(id);
      // si no se encuentran proyectos
      if (!proyectos) {
        return res
          .status(204)
          .json({ message: "Este usuario no tiene proyectos" });
      }
      // enviar los datos
      res.status(200).json(proyectos);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // crear un proyecto
  static async create(req, res) {
    try {
      // capturar
      const {
        pool_horas,
        fecha_fin,
        id_responsable_cliente,
        tecnicos,
        id_lider_proyecto
      } = req.body;
      let { nombre, tarifa } = req.body;
      // eliminar espacios en blanco del string
      nombre = nombre.trim();
      // establecer status false/0
      const status = 0;
      // comprobar si existe el usuario
      for (const tecnico of tecnicos) {
        const usuario = await user.findOneById(tecnico.id_usuario);
        if (!usuario) {
          return res.status(404).json({
            code: "Recurso no encontrado",
            message: "Id de usuario no encontrado",
            details: `Usuario con el id '+ ${tecnico.id_usuario} + ' no se encuentra en la base de datos`,
            timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
            requestID: tecnico.id_usuario,
          });
        }
      }
      // comprobar si existe el lider de proyecto
      const lider = await user.findOneById(id_lider_proyecto);
        if (!lider) {
          return res.status(404).json({
            code: "Recurso no encontrado",
            message: "Id de lider de proyecto no encontrado",
            details: `Líder de proyecto con el id '+ ${id_lider_proyecto} + ' no se encuentra en la base de datos`,
            timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
            requestID: id_lider_proyecto,
          });
        }
      // comprobar que recibo un responsable cliente
      if (id_responsable_cliente == "") {
        return res.status(400).json({
          code: "Recurso no encontrado",
          message: "Se requiere un responsable cliente para registrar su proyecto",
          details:
            "El responsable cliente con el id " +
            id_responsable_cliente +
            " no se encuentra en la base de datos",
          timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
          requestID: id_responsable_cliente,
        })
      }
      // comprobar si existe el responsable cliente
      const responsableClienteFound = await ResponsableClienteReplica.findByPk(
        id_responsable_cliente
      );
      if (!responsableClienteFound) {
        return res.status(404).json({
          code: "Recurso no encontrado",
          message: "Responsable cliente no encontrado",
          details:
            "El responsable cliente con el id " +
            id_responsable_cliente +
            " no se encuentra en la base de datos",
          timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
          requestID: id_responsable_cliente,
        });
      }
      // verificar que no exista otro proyecto con el mismo nombre para el mismo cliente
      const proyectoExistente = await Proyecto.findOneName(
        nombre,
        id_responsable_cliente
      );
      if (proyectoExistente) {
        return res.status(400).json({
          message:
            "El responsable cliente ya tiene un proyecto con el mismo nombre",
        });
      }
      // fecha de inicio
      const now = new Date();
      const fecha_inicio = date.format(now, "YYYY-MM-DD");
      // verificar que la fecha de finalizacion sea posterior a la fecha de inicio
      let fin = new Date(fecha_fin);
      fin = date.format(fin, "YYYY-MM-DD");
      if (fin < fecha_inicio) {
        return res.status(400).json(
          {
            code: "Bad Request",
            message: "Fecha de fin no válida, verifique que sea posterior a la fecha de creación",
            details: "La fecha de finalización debe ser posterior a la fecha de creación",
            timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
            requestID: fecha_fin,
          }
        );
      }
      // declarar variable facturable
      let facturable = true
      // comprobar si pool de horas es 0 (no facturable)
      if (pool_horas == 0) {
        facturable = false
        tarifa = 0
      }
      // instanciar un objeto de la clase proyecto
      const proyecto = new Proyecto(
        nombre,
        tarifa,
        status,
        pool_horas * 60,
        fecha_inicio,
        fecha_fin,
        id_responsable_cliente,
        tecnicos,
        facturable,
        id_lider_proyecto
      );
      // guardar en la base de datos y actualiza la tabla asignaciones
      await Proyecto.create(proyecto);
      // devolver respuesta
      res.status(201).json({ message: "Proyecto creado correctamente" });
      // enviar correo a los tecnicos
      for (const tecnico of tecnicos) {
        const usuario = await user.findOneById(tecnico.id_usuario);
        Proyecto.sendEmailCreate(usuario, proyecto)
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // concretar un proyecto
  static async concretarProyecto(req, res) {
    try {
      // capturar id de proyecto
      const { id } = req.params
      // capturar al lider de proyecto que realiza la accion
      const { id_lider_proyecto } = req.body
      // comprobar si existe el proyecto
      const proyectoExistente = await Proyecto.findByPk(id);
      if (!proyectoExistente) {
        return res.status(404).json({
          code: "Recurso no encontrado",
          message: "Proyecto no encontrado",
          details:
            "Proyecto con el id " + id + " no se encuentra en la base de datos",
          timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
          requestID: id,
        });
      }
      // actualiza el status del proyecto a completado
      await Proyecto.concretarProyecto(id, id_lider_proyecto)
      // actualiza el status de las tareas asociadas a completado
      await tarea.completeTaskByProjectId(id)
      res.status(200).json({ message: "Proyecto concretado correctamente" })
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // editar un proyecto
  static async editarProyecto(req, res) {
    try {
      // capturar datos del proyecto
      const { id } = req.params
      const { tarifa, fecha_fin, id_responsable_cliente, tecnicos, id_lider_proyecto} = req.body;
      let { nombre_proyecto, pool_horas_contratadas } = req.body;
      // comprobar si existe el proyecto
      const proyectoExistente = await Proyecto.findByPk(id);
      if (!proyectoExistente) {
        return res.status(404).json({
          code: "Recurso no encontrado",
          message: "Proyecto no encontrado",
          details:
            "Proyecto con el id " + id + " no se encuentra en la base de datos",
          timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
          requestID: id,
        });
      }
      // verificar que no exista otro proyecto con el mismo nombre para el mismo cliente
      const proyectoNombre = await Proyecto.findOneName(
        nombre_proyecto,
        id_responsable_cliente
      );
      if (proyectoNombre && proyectoExistente.nombre !== nombre_proyecto) {
        return res.status(400).json({
          message: "El responsable cliente ya tiene un proyecto con dicho nombre",
        });
      }
      // objeto Date con la fecha de inicio del proyecto
      let fecha_inicio = new Date(proyectoExistente.fecha_inicio);
      fecha_inicio = date.format(fecha_inicio, "YYYY-MM-DD");
      // verificar que la fecha de finalizacion sea posterior a la fecha de inicio
      let fin = new Date(fecha_fin);
      fin = date.addDays(fin, 1)
      fin = date.format(fin, "YYYY-MM-DD");
      if (fin <= fecha_inicio) {
        return res.status(400).json(
          {
            code: "Bad Request",
            message: "Fecha de fin no válida, verifique que sea posterior a la fecha de creación",
            details:
              "La fecha de finalización debe ser posterior a la fecha de creación",
            timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
            requestID: fecha_fin,
          }
        );
      }
      // verificar que la fecha de finalizacion sea posterior al dia actual
      const now = date.format(new Date(), "YYYY-MM-DD")
      if (fin <= now) {
        return res.status(400).json(
          {
            code: "Bad Request",
            message: "Fecha de fin no válida, verifique que sea posterior a la fecha actual",
            details: "La fecha de finalización debe ser posterior a la fecha actual",
            timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
            requestID: fecha_fin,
          }
        );
      }
      // verificar las tareas dentro del rango de fecha de finalizacion
      const tasks = await tarea.findTaskByProjectId(id)
      for (const task of tasks) {
        let fechaTarea = new Date(tarea.fecha)
        fechaTarea = date.format(fechaTarea, "YYYY-MM-DD")
        if (fechaTarea > fin) {
          await task.completeTasksById(task.id_tarea)
        }
      }
      // conversion de pool_horas de horas a minutos
      pool_horas_contratadas = pool_horas_contratadas*60
      // declarar pool de horas ya existente en la base de datos
      let pool_horas = convertirMinutos(proyectoExistente.pool_horas)
      // declarar horas trabajadas ya existente en la base de datos
      let horas_trabajadas = convertirMinutos(proyectoExistente.horas_trabajadas)
      // let horas_trabajadas = proyectoExistente.horas_trabajadas
      // calculo pool de horas
      if (!(pool_horas_contratadas == proyectoExistente.pool_horas_contratadas) && (proyectoExistente.facturable == true)) {
        pool_horas = pool_horas_contratadas-horas_trabajadas
      }
      // instanciar un objeto de la clase proyecto
      const proyecto = new Proyecto(
        nombre_proyecto,
        tarifa,
        proyectoExistente.status,
        pool_horas_contratadas,
        proyectoExistente.fecha_inicio,
        fin,
        id_responsable_cliente,
        tecnicos,
        proyectoExistente.facturable,
        id_lider_proyecto
      );
      // actualiza el proyecto
      await Proyecto.editar(proyecto, pool_horas, id)
      // devolver respuesta
      res.status(200).json({ message: "Proyecto actualizado correctamente" })
      // enviar correo a los tecnicos
      for (const tecnico of tecnicos) {
        const usuario = await user.findOneById(tecnico.id_usuario);
        Proyecto.sendEmailUpdate(usuario, proyecto, pool_horas)
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // eliminar un proyecto
  static async delete(req, res) {
    try {
      // capturar id de proyecto
      const { id } = req.params;
      // comprobar si existe el proyecto
      const projectFound = await Proyecto.findByPk(id);
      if (!projectFound) {
        return res.status(404).json({
          code: "Recurso no encontrado",
          message: "Proyecto no encontrado",
          details:
            "Proyecto con el id " + id + " no se encuentra en la base de datos",
          timestamp: date.format(new Date(), "YYYY-MM-DDTHH:mm:ss"),
          requestID: id,
        });
      }
      // eliminar un proyecto de la base de datos
      await Proyecto.delete(id);
      res.status(200).json({ message: "Proyecto eliminado correctamente" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async generarPDFProyectoSimple(req, res) {
    try {
      // Capturar el id_proyecto de los parámetros de la solicitud
      const { id } = req.params;

      // Verificar si se proporcionó el id_proyecto
      if (!id) {
        return res
          .status(400)
          .json({ message: "Falta el parámetro id_proyecto" });
      }
      const project = await Proyecto.findByPkPDF(id);

      // Comprobar si el proyecto existe
      if (!project) {
        return res.status(404).json({ message: "Proyecto no encontrado" });
      }

      // Configurar el contenido HTML que se va a renderizar en el PDF
      const content = `
        <!DOCTYPE html>
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <title>Reporte</title>
        </head>
        
        <body>
            <div class="flex flex-col justify-between my-8 mx-8">
                <!-- Encabezado -->
                <div class="flex justify-between items-center border-2 border-sky-500 rounded-2xl my-6 px-4">
                    <!-- Logo -->
                    <div class="flex p-4">
                <h2 class="text-2xl font-bold text-center">Hormi<span class="text-sky-500">Watch</span></h2>
                    </div>
                    <!-- Titulo -->
                    <div class="p-4">
                        <h1 class="text-xl font-bold text-center text-gray-800">Reporte de Atencion al Cliente</h1>
                    </div>
                    <!-- Datos Solicitud -->
                    <div class="text-right border-l-2 h-24 border-sky-500 flex flex-col p-4 justify-center">
                        <p
                        class="text-sm font-bold text-gray-800"
                        >Fecha:
                            <span class="font-normal">
                            ${new Date().toLocaleDateString()}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800">
                            Codigo Proyecto:
                            <span class="font-normal">
                            ${project.id_proyecto.split("-")[0]}
                            </span>
                        </p>
                    </div>
                </div>
                <!-- Datos del Cliente -->
                <h6 class="text-left font-bold">
                    1. Datos del Cliente
                </h6>
                <h6 class="text-left font-bold">
                <div class="flex justify-between items-center border-2 border-sky-500 rounded-2xl">
                <div class="flex flex-col w-1/2 gap-y-2 py-2">
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Nombre: 
                        <span class="font-normal">${
                          project.nombre_cliente
                        }</span>
    
                    </p>
                        </p>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Codigo Cliente:
                            <span class="font-normal">
                            ${project.id_cliente.split("-")[0]}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 px-2">
                            Departamento:
                            <span class="font-normal">
                            ${project.departamento_responsable_cliente}
                            </span>
                        </p>
                    </div>
                    <div class="flex flex-col border-l-2 w-1/2 border-sky-500 gap-y-2 py-2">
                       <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Responsable Cliente:
                            <span class="font-normal">
                            ${project.nombre_responsable_cliente}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Cargo:
                            <span class="font-normal">
                            ${project.cargo_responsable_cliente}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 px-2">
                            Telefono:
                            <span class="font-normal">
                            ${project.telefono_responsable_cliente}
                            </span>
                       </p> 
                    </div>
                </div>
                <!-- Datos del Proyecto  -->
                <h6 class="text-left font-bold">
                    2. Datos del Proyecto
                </h6>
                <div class="flex flex-col gap-y-2 py-2 border-2 border-sky-500 rounded-2xl">
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Nombre del Proyecto:
                        <span class="font-normal">
                        ${project.nombre_proyecto}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Fecha de Inicio:
                        <span class="font-normal">
                        ${project.fecha_inicio}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Pool de Horas Asignadas
                        <span class="font-normal">
                        ${project.pool_horas}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 px-2 border-b-[1px] border-gray-600">
                        Tarifa por Hora:
                        <span class="font-normal">
                        ${project.tarifa}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 px-2">
                        Tecnico Asignado:
                        <span class="font-normal">
                        ${project.usuarios.map(
                          (usuario) => ` ${usuario.nombre} ${usuario.apellido}`
                        )}
                        </span>
                    </p>
                </div>
                <!-- Detalles del Proyecto -->
                <h6 class="text-left font-bold">
                    3. Detalles del Proyecto
                </h6>
                <div class="flex flex-col gap-y-2 py-2 border-2 border-sky-500 rounded-2xl">
                    <!-- Encabezado de la tabla explicando la Leyenda de la columna estatus -->
                    <p class="text-xs text-gray-800 text-center px-2">
                        Leyenda Columna Estatus:  C= Actividad Culminada /  P= Actividad Pendiente
                    </p>
                    <p class="text-xs text-gray-800 text-center px-2">
                        Horario Oficina <span class="font-bold" >
                            (HO) : Factor = 1
                        </span> / Extrahorario 
                        
                        <span class="font-bold" >
                            (EH) : Factor = 1,5
                        </span>/ Dom y feriado <span class="font-bold" >
                            (DF): Factor = 2
                        </span>
                    </p>
                    <div class="overflow-x-auto px-2">
                        <table class="min-w-full divide-y divide-gray-200">
                          <thead class="bg-sky-500 text-sky-100">
                            <tr>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Servicio</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Fecha</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Hora Inicio</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Hora Fin</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Total Horas</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Valor de las Horas con Factor</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Total Tarifa</th>
                            </tr>
                          </thead>
                          <tbody class="bg-white divide-y divide-gray-200 text-gray-800">
                          <!-- Iterar sobre las tareas -->
                          ${project.tareas
                            .map(
                              (tarea) => `
                            <tr>
                              <td class="px-2 py-4 whitespace-nowrap text-xs font-normal text-gray-800 text-center border">${
                                tarea.servicio.id_servicio.split("-")[0] === "OTR" ?  `${tarea.descripcion}` : `${tarea.servicio.nombre_servicio}`
                              }</td>
                              <td class="px-2 py-4 whitespace-nowrap text-xs font-normal text-gray-800 text-center border">${
                                tarea.fecha
                              }</td>
                              <td class="px-2 py-4 whitespace-nowrap text-xs font-normal text-gray-800 text-center border">${
                                tarea.hora_inicio
                              }</td>
                              <td class="px-2 py-4 whitespace-nowrap text-xs font-normal text-gray-800 text-center border">${
                                tarea.hora_fin
                              }</td>
                              <td class="px-2 py-4 whitespace-nowrap text-xs font-normal text-gray-800 text-center border">${
                                calcularDiferenciaDeTiempo(
                                  tarea.hora_inicio,
                                  tarea.hora_fin
                                ).tiempo_formateado
                              }</td>
                              <td class="px-2 py-4 whitespace-nowrap text-xs font-normal text-gray-800 text-center border">${
                                tarea.factor_tiempo_total
                              }</td>
                              <td class="px-2 py-4 whitespace-nowrap text-xs font-normal text-gray-800 text-center border">${
                                tarea.total_tarifa
                              }</td>
                            </tr>
                            `
                            )
                            .join("")}
                          </tbody>
                          <tfoot class="">
                            <tr class="bg-white border-[1px]">
                              <th scope="col" class="px-2 py-3 "></th>
                              <th scope="col" class="px-2 py-3 "></th>
                              <th scope="col" class="px-2 py-3 "></th>
                              <th scope="col" class="px-2 py-3 "></th>
                              <th scope="col" class="px-2 py-3 "></th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border-2  border-sky-500 bg-sky-500 text-sky-100">Total de Horas</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">${
                                project.total_horas_tareas
                              }</th>
                            </tr>
                        </table>
                      </div>
                </div>
                <!-- Aceptacion -->
                <h6 class="text-left font-bold">
                    4. Aceptacion
                </h6>
                <div class="flex justify-between items-center border-2 border-sky-500 rounded-2xl">
                    <div class="flex flex-col gap-y-2 py-2 w-1/2">
                        <h6 class="text-left font-bold pl-2">
                            Por el Cliente:
                        </h6>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Nombre del Cliente: 
                            <span class="font-normal">
                            ${project.nombre_responsable_cliente}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            C.I:
                            <span class="font-normal">
                            ${project.cedula_responsable_cliente}
                            </span>
                        <p class="text-sm font-bold text-gray-800 px-2">
                            Firma: 
                            <span class="font-normal">
                                __________________
                            </span>
                        </p>
                    </div>
                    <div class="flex flex-col gap-y-2 py-2 w-1/2 border-l-2 border-sky-500">
                        <h6 class="text-left font-bold pl-2">
                            Por el Tecnico:
                        </h6>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Nombre del Tecnico: 
                            <span class="font-normal">
                                <!-- Muestra todos los usuarios del array -->
                                ${project.usuarios
                                  .map(
                                    (usuario) => `
                                      ${usuario.nombre} ${usuario.apellido}
                                      `
                                  )
                                  .join(", ")}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            C.I:
                            <span class="font-normal">
                               <!-- Muestra todos las cedulas de los usuarios -->
                                ${project.usuarios
                                  .map((usuario) => ` ${usuario.cedula}`)
                                  .join(", ")}
                            </span>
                        </p>  
                                                            <!-- Genera espacio de firmas por cada usuario -->
                                        <p class="text-sm font-bold text-gray-800 px-2">
                                        Firma: 
                                        <span class="font-normal">
                                           ______________________________________________________
                                        </span>
                                        </p>
          

                    </div>
                </div>
                <!-- Cierre -->
                <div class="flex flex-col gap-y-2 my-4 py-2 border-2 border-sky-500 rounded-2xl">
                    <p class="p-2">
                        Al firmar este reporte como receptor del servicio prestado, el cliente acepta y está conforme con el
                        mismo, así como que ha verificado su efectiva ejecución. Los términos para el posterior pago de la
                        correspondiente factura, si el caso amerita, será según las tarifas vigentes para el tipo de servicio
                        prestado y/o cotizado, previamente autorizado por el Cliente.
                    </p>
                </div>
            </div>
        </div>
        </body>
        
        </html>
        `;
      // Crear una instancia del navegador con Puppeteer
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      /*const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/opt/render/.cache/puppeteer/chrome/linux-123.0.6312.122/chrome-linux64/chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });*/
      // Abrir una nueva página
      const page = await browser.newPage();

      //await page.goto("https://developer.chrome.com/")

      // Establecer el contenido HTML de la página
      await page.setContent(content);
      // Generar el PDF en formato A4
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

      // Cerrar el navegador
      await browser.close();

      // Enviar el PDF como respuesta HTTP
      res.contentType("application/pdf");
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async generarPDFProyectoSimpleUser(req, res) {
    try {
      // Capturar el id_proyecto de los parámetros de la solicitud
      const { id } = req.params;

      // Verificar si se proporcionó el id_proyecto
      if (!id) {
        return res
          .status(400)
          .json({ message: "Falta el parámetro id_proyecto" });
      }
      const project = await Proyecto.findByPkPDF(id);

      // Comprobar si el proyecto existe
      if (!project) {
        return res.status(404).json({ message: "Proyecto no encontrado" });
      }
      // Configurar el contenido HTML que se va a renderizar en el PDF
      const content = `
        <!DOCTYPE html>
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <title>Reporte</title>
        </head>
        
        <body>
            <div class="flex flex-col justify-between my-8 mx-8">
                <!-- Encabezado -->
                <div class="flex justify-between items-center border-2 border-sky-500 rounded-2xl my-6 px-4">
                    <!-- Logo -->
                    <div class="flex p-4">
                <h2 class="text-2xl font-bold text-center">Hormi<span class="text-sky-500">Watch</span></h2>
                    </div>
                    <!-- Titulo -->
                    <div class="p-4">
                        <h1 class="text-xl font-bold text-center text-gray-800">Reporte de Atencion al Cliente</h1>
                    </div>
                    <!-- Datos Solicitud -->
                    <div class="text-right border-l-2 h-24 border-sky-500 flex flex-col p-4 justify-center">
                        <p
                        class="text-sm font-bold text-gray-800"
                        >Fecha:
                            <span class="font-normal">
                            ${new Date().toLocaleDateString()}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800">
                            Codigo Proyecto:
                            <span class="font-normal">
                            ${project.id_proyecto.split("-")[0]}
                            </span>
                        </p>
                    </div>
                </div>
                <!-- Datos del Cliente -->
                <h6 class="text-left font-bold">
                    1. Datos del Cliente
                </h6>
                <h6 class="text-left font-bold">
                <div class="flex justify-between items-center border-2 border-sky-500 rounded-2xl">
                <div class="flex flex-col w-1/2 gap-y-2 py-2">
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Nombre: 
                        <span class="font-normal">${
                          project.nombre_cliente
                        }</span>
    
                    </p>
                        </p>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Codigo Cliente:
                            <span class="font-normal">
                            ${project.id_cliente.split("-")[0]}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 px-2">
                            Departamento:
                            <span class="font-normal">
                            ${project.departamento_responsable_cliente}
                            </span>
                        </p>
                    </div>
                    <div class="flex flex-col border-l-2 w-1/2 border-sky-500 gap-y-2 py-2">
                       <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Responsable Cliente:
                            <span class="font-normal">
                            ${project.nombre_responsable_cliente}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Cargo:
                            <span class="font-normal">
                            ${project.cargo_responsable_cliente}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 px-2">
                            Telefono:
                            <span class="font-normal">
                            ${project.telefono_responsable_cliente}
                            </span>
                       </p> 
                    </div>
                </div>
                <!-- Datos del Proyecto  -->
                <h6 class="text-left font-bold">
                    2. Datos del Proyecto
                </h6>
                <div class="flex flex-col gap-y-2 py-2 border-2 border-sky-500 rounded-2xl">
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Nombre del Proyecto:
                        <span class="font-normal">
                        ${project.nombre_proyecto}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Fecha de Inicio:
                        <span class="font-normal">
                        ${project.fecha_inicio}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Pool de Horas Asignadas
                        <span class="font-normal">
                        ${project.pool_horas}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 px-2 border-b-[1px] border-gray-600">
                        Tarifa por Hora:
                        <span class="font-normal">
                        ${project.tarifa}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 px-2">
                        Tecnico Asignado:
                        <span class="font-normal">
                        ${project.usuarios.map(
                          (usuario) => ` ${usuario.nombre} ${usuario.apellido}`
                        )}
                        </span>
                    </p>
                </div>
                <!-- Detalles del Proyecto -->
                <h6 class="text-left font-bold">
                    3. Detalles del Proyecto
                </h6>
                <div class="flex flex-col gap-y-2 py-2 border-2 border-sky-500 rounded-2xl">
                    <!-- Encabezado de la tabla explicando la Leyenda de la columna estatus -->
                    <p class="text-xs text-gray-800 text-center px-2">
                        Leyenda Columna Estatus:  C= Actividad Culminada /  P= Actividad Pendiente
                    </p>
                    <p class="text-xs text-gray-800 text-center px-2">
                        Horario Oficina <span class="font-bold" >
                            (HO) : Factor = 1
                        </span> / Extrahorario 
                        
                        <span class="font-bold" >
                            (EH) : Factor = 1,5
                        </span>/ Dom y feriado <span class="font-bold" >
                            (DF): Factor = 2
                        </span>
                    </p>
                    <div class="overflow-x-auto px-2">
                        <table class="min-w-full divide-y divide-gray-200">
                          <thead class="bg-sky-500 text-sky-100">
                            <tr>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Tecnico</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Cedula</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Correo Electronico</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Cantidad de Tareas</th>
                              <th scope="col" class="px-2 py-3 text-xs font-bold tracking-wider text-center border">Tiempo total</th>
                            </tr>
                          </thead>
                          <tbody class="bg-white divide-y divide-gray-200 text-gray-800">
                          <!-- Iterar sobre las tareas -->
                          ${project.tecnicos
                            .map(
                               (usuario) => `
                            <tr>
                              <td class="px-2 py-4 whitespace-nowrap text-sm font-normal text-gray-800 text-center border">${
                                usuario.nombre
                              } ${usuario.apellido}</td>
                              <td class="px-2 py-4 whitespace-nowrap text-sm font-normal text-gray-800 text-center border">${
                                usuario.cedula
                              }</td>
                              <td class="px-2 py-4 whitespace-nowrap text-sm font-normal text-gray-800 text-center border">${
                                usuario.email
                              }</td>
                              <td class="px-2 py-4 whitespace-nowrap text-sm font-normal text-gray-800 text-center border">${
                                 usuario.allTask
                              }</td>
                              <td class="px-2 py-4 whitespace-nowrap text-sm font-normal text-gray-800 text-center border">${
                                 usuario.allhours
                              }</td>                              
                            </tr>
                            `
                            )
                            .join("")}
                          </tbody>
                          <tfoot class="">
                            <tr class="bg-white border-[1px]">                              
                            </tr>
                        </table>
                      </div>
                </div>
                <!-- Aceptacion -->
                <h6 class="text-left font-bold">
                    4. Aceptacion
                </h6>
                <div class="flex justify-between items-center border-2 border-sky-500 rounded-2xl">
                    <div class="flex flex-col gap-y-2 py-2 w-1/2  border-sky-500">
                        <h6 class="text-left font-bold pl-2">
                            Por el Lider Tecnico:
                        </h6>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Nombre: 
                            <span class="font-normal">

                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            C.I:
                            <span class="font-normal">

                            </span>
                        </p>  
                                                            <!-- Genera espacio de firmas por cada usuario -->
                                        <p class="text-sm font-bold text-gray-800 px-2">
                                        Firma: 
                                        <span class="font-normal">
                                           ______________________________________________________
                                        </span>
                                        </p>
          

                    </div>
                </div>
                <!-- Cierre -->
                <div class="flex flex-col gap-y-2 my-4 py-2 border-2 border-sky-500 rounded-2xl">
                    <p class="p-2">
                        Al firmar este reporte como receptor del servicio prestado, el cliente acepta y está conforme con el
                        mismo, así como que ha verificado su efectiva ejecución. Los términos para el posterior pago de la
                        correspondiente factura, si el caso amerita, será según las tarifas vigentes para el tipo de servicio
                        prestado y/o cotizado, previamente autorizado por el Cliente.
                    </p>
                </div>
            </div>
        </div>
        </body>
        
        </html>
        `;
      // Crear una instancia del navegador con Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/opt/render/.cache/puppeteer/chrome/linux-123.0.6312.122/chrome-linux64/chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // Abrir una nueva página
      const page = await browser.newPage();

      // Establecer el contenido HTML de la página
      await page.setContent(content);

      // Generar el PDF en formato A4
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

      // Cerrar el navegador
      await browser.close();

      // Enviar el PDF como respuesta HTTP
      res.contentType("application/pdf");
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async generarPDFProyectoGrafico(req, res) {
    try {
      // Capturar el id_proyecto de los parámetros de la solicitud
      const { id } = req.params;

      // Verificar si se proporcionó el id_proyecto
      if (!id) {
        return res
          .status(400)
          .json({ message: "Falta el parámetro id_proyecto" });
      }
      const project = await Proyecto.findByPkPDF(id);

      // Comprobar si el proyecto existe
      if (!project) {
        return res.status(404).json({ message: "Proyecto no encontrado" });
      }

          
      // Estructura HTML con un lienzo para el gráfico
      const content = `
<!DOCTYPE html>
<html lang="es">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
<title>Reporte</title>
    <script src="https://cdn.syncfusion.com/ej2/dist/ej2.min.js"></script>
    <script>
        // Esperar a que se cargue la ventana antes de ejecutar el código JavaScript
        window.onload = async function() {
          var dataSource = [
            ${project.total_tareas
              .map(
                (tarea) =>
                  `{ 'x': '${tarea.nombre_servicio}', y: ${tarea.tiempo_total}, 
                  'label' : '${tarea.id_servicio}: ${formatearMinutos(tarea.tiempo_total)}'}`
              )
              .join(",\n")}
        ];
            var pie = new ej.charts.AccumulationChart({
                //Inicializando la Serie
                series: [{
                    dataSource: dataSource,                 
                    dataLabel: {
                        visible: true,
                        position: 'Outside', 
                        name: 'label',
                        font: {
                          size: '15px' // Tamaño de la fuente de las etiquetas de datos
                      }
                    },
                    xName: 'x',
                    yName: 'y'
                }],
                legendSettings: {
                  visible: true,
                  position: 'Bottom',
                  height: '20%',
                  width: '64%',
                  textWrap:'Wrap',
                  maximumLabelWidth:60,
              }
            });
            pie.appendTo('#container');
            // Notificar a Node.js cuando la página esté completamente cargada
            window._pageLoaded = true;
        };
    </script>
    <style>
        .container {
            max-width: 600px; /* Ancho máximo para el contenedor principal */
            margin: 0 auto; /* Margen automático para centrar el contenedor */
            overflow: hidden; /* Ocultar el desbordamiento del contenido */
        }

        .graph-container {
            width: 100%; /* Asegurar que el contenedor del gráfico tenga el ancho completo */
            overflow: auto; /* Permitir el desplazamiento horizontal si el gráfico excede el ancho */
        }
    </style>
</head>

<body>
            <div class="flex flex-col justify-between my-8 mx-8">
                <!-- Encabezado -->
                <div class="flex justify-between items-center border-2 border-sky-500 rounded-2xl my-6 px-4">
                    <!-- Logo -->
                    <div class="flex p-4">
                <h2 class="text-2xl font-bold text-center">Hormi<span class="text-sky-500">Watch</span></h2>
                    </div>
                    <!-- Titulo -->
                    <div class="p-4">
                        <h1 class="text-xl font-bold text-center text-gray-800">Reporte de Atencion al Cliente</h1>
                    </div>
                    <!-- Datos Solicitud -->
                    <div class="text-right border-l-2 h-24 border-sky-500 flex flex-col p-4 justify-center">
                        <p
                        class="text-sm font-bold text-gray-800"
                        >Fecha:
                            <span class="font-normal">
                            ${new Date().toLocaleDateString()}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800">
                            Codigo Proyecto:
                            <span class="font-normal">
                            ${project.id_proyecto.split("-")[0]}
                            </span>
                        </p>
                    </div>
                </div>
                <!-- Datos del Cliente -->
                <h6 class="text-left font-bold">
                    1. Datos del Cliente
                </h6>
                <h6 class="text-left font-bold">
                <div class="flex justify-between items-center border-2 border-sky-500 rounded-2xl">
                <div class="flex flex-col w-1/2 gap-y-2 py-2">
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Nombre: 
                        <span class="font-normal">${
                          project.nombre_cliente
                        }</span>
    
                    </p>
                        </p>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Codigo Cliente:
                            <span class="font-normal">
                            ${project.id_cliente.split("-")[0]}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 px-2">
                            Departamento:
                            <span class="font-normal">
                            ${project.departamento_responsable_cliente}
                            </span>
                        </p>
                    </div>
                    <div class="flex flex-col border-l-2 w-1/2 border-sky-500 gap-y-2 py-2">
                       <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Responsable Cliente:
                            <span class="font-normal">
                            ${project.nombre_responsable_cliente}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                            Cargo:
                            <span class="font-normal">
                            ${project.cargo_responsable_cliente}
                            </span>
                        </p>
                        <p class="text-sm font-bold text-gray-800 px-2">
                            Telefono:
                            <span class="font-normal">
                            ${project.telefono_responsable_cliente}
                            </span>
                       </p> 
                    </div>
                </div>
                <!-- Datos del Proyecto  -->
                <h6 class="text-left font-bold">
                    2. Datos del Proyecto
                </h6>
                <div class="flex flex-col gap-y-2 py-2 border-2 border-sky-500 rounded-2xl">
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Nombre del Proyecto:
                        <span class="font-normal">
                        ${project.nombre_proyecto}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Fecha de Inicio:
                        <span class="font-normal">
                        ${project.fecha_inicio}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Pool de Horas Asignadas
                        <span class="font-normal">
                        ${project.pool_horas_contratadas}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 border-b-[1px] border-gray-600 px-2">
                        Pool de Horas Restantes
                        <span class="font-normal">
                        ${project.pool_horas}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 px-2 border-b-[1px] border-gray-600">
                        Tarifa por Hora:
                        <span class="font-normal">
                        ${project.tarifa}
                        </span>
                    </p>
                    <p class="text-sm font-bold text-gray-800 px-2">
                        Tecnico Asignado:
                        <span class="font-normal">
                        ${project.usuarios.map(
                          (usuario) => ` ${usuario.nombre} ${usuario.apellido}`
                        )}
                        </span>
                    </p>
                </div>
                <!-- Detalles del Proyecto -->
                <h6 class="text-left font-bold">
                    3. Graficas del Proyecto
                </h6>
                <div class="flex flex-col gap-y-2 py-2 border-2 border-sky-500 rounded-2xl">
        <div class="container">
            <div class="graph-container" id="container">
            <div id="container"></div>
            </div>
        </div>
    </div>
                
               
                
                
                
            </div>
        </div>
        </body>

</html>
`;

      // Crear una instancia del navegador con Puppeteer
      //const browser = await puppeteer.launch();
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/opt/render/.cache/puppeteer/chrome/linux-123.0.6312.122/chrome-linux64/chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // Abrir una nueva página
      const page = await browser.newPage();

      // Establecer el contenido HTML de la página
      await page.setContent(content);

      // Esperar a que la página esté completamente cargada
      await page.waitForFunction("window._pageLoaded");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Generar el PDF en formato A4
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

      // Cerrar el navegador
      await browser.close();

      // Enviar el PDF como respuesta HTTP
      res.contentType("application/pdf");
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default ProyectoController;
