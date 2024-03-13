import z from "zod"

// tecnicos


//se asegura que los campos ingresados al crear un proyecto sean validos
export const createEschema = z.object({
    tarifa: z.number({
        required_error: 'Tarifa es requerido',
        invalid_type_error: 'Tarifa debe ser un número'
        }).nonnegative({
            message: 'Tarifa debe ser un número positivo'
        }),
    nombre: z.string({
        required_error: 'Nombre es requerido',
        invalid_type_error: 'Nombre debe ser tipo cadena de carácteres'
        }).max(255, {
            message: 'Nombre debe tener 255 o menos carácteres'
        }),
    id_responsable_cliente: z.string({
        required_error: 'Id de responsable cliente es requerido',
        invalid_type_error: 'Id de responsable cliente debe ser tipo cadena de carácteres'
        }).uuid({
            message: "Id de responsable cliente debe ser tipo UUID"
        }),
    tecnicos: z.array(
        z.object({
            id_usuario: z.string({
                required_error: 'Id de los usuarios técnicos es requerido',
                invalid_type_error: 'Los usuarios técnicos debe ser tipo array'
            })
        })
    ).min(1, 'Debe haber al menos un técnico en el array'),
    pool_horas: z.number({
        required_error: 'Pool de horas es requerido',
        invalid_type_error: 'Pool de horas debe ser un número'
        }).nonnegative({
            message: 'Pool de horas debe ser un número positivo'
        }),
    fecha_fin: z.coerce.date({
        invalid_type_error: "La fecha de fin debe ser una cadena de caráteres y formato ISO 8601",
    })
}).partial()