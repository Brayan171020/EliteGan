import z from 'zod';

//se asegura que los campos ingresados al registro sean validos
export const registerSchema = z.object({
    nombre: z.string({
        required_error: 'name is required'
    }),
    apellido: z.string({
        required_error: 'lastName is required'
    }),
    email: z.string({
        required_error: 'Email is required'
    }).email({
        message: 'Invalid email'
    }),
    password: z.string({
        required_error: 'password is required'
    }).min(6, {
        message: 'Password must be at least 6 characters'
    }),
    telefono: z.number({
        required_error: 'cellphone is required, in number'
    }),
    empresa: z.string({
        required_error: 'empress is required, in string'
    }).optional(),
    cargo: z.string({
        required_error: 'cargo is required, in string'
    }).optional(),
    departamento: z.string({
        required_error: 'departament is required, in string'
    }).optional(),
    cedula: z.number({
        required_error: 'cedula es requerido',
        invalid_type_error: 'cedula debe ser un número'
        }).nonnegative({
            message: 'cedula debe ser un número positivo'
        }),


})

//se asegura que los campos ingresados al login sean validos
export const loginSchema = z.object({
    email: z.string({
        required_error: 'Email is required'
    }).email({
        message: 'Invalid email'
    }),
    password: z.string({
        required_error: 'password is required'
    }).min(6, {
        message: 'Password must be at least 6 characters'
    })
})

export const updateRolfromAdmin = z.object({
    email: z.string({
        required_error: 'Email is required'
    }).email({
        message: 'Invalid email'
    }),
    nombre_rol: z.string({
        required_error: 'rol is required'
    })
});

