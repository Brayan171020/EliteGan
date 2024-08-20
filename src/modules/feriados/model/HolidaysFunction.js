import holidays from './HolidaysModel.js';
import { Feriados } from '../../../database/hormiwatch/feriados.js'
import { v4 } from "uuid";
import "dotenv/config";

let connStr = "DATABASE=SYSSOP;HOSTNAME=192.168.1.28;UID=db2inst1;PWD=H0l41324%;PORT=25000;PROTOCOL=TCPIP";

const dbSelect = process.env.SELECT_DB;


//guarda al Feriados para persistencia
async function saveHoliday(holiday) {
    if (dbSelect == "SEQUELIZE") {
        return await Feriados.create({ nombre_feriado: holiday.nombre_feriado, fecha_feriado: holiday.fecha_feriado },
            { fields: ['nombre_feriado', 'fecha_feriado'] });
    }

    //DB2

    /*if (dbSelect == "DB2"){
    const id = v4().split('-')[0];
    //DB2
    
    var holidayID = await new Promise((resolve, reject) => {
        ibmdb.open(connStr, async (err, conn) => {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            try {
              const data = await conn.query(
                `INSERT INTO TECNICO.FERIADO(ID, NOMBRE, FECHA) VALUES ('${id}', '${holiday.name}', '${holiday.date}')`
              );
              const id = await conn.query("SELECT MAX(ID) FROM TECNICO.FERIADO");
              conn.close(() => {
                // console.log('done');
              });
              resolve(id[0]['1']);
            } catch (err) {
              console.log(err);
              reject(err);
            }
          }
        });
      });
      if(!holidayID) return new holiday(holiday.name, holiday.date,'1')
      return new holiday(holiday.name, holiday.date,holidayID+1 );
    }*/

    return null;
    //holidays.holidays.push(holiday);
}

//busca en la lista de feriados una fecha pasada por parametro
async function findOne(id) {
    //SEQUELIZE
    if (dbSelect == "SEQUELIZE") {
        var holidayFound = await Feriados.findOne(
            {
                where: { id: id }
            }
        );

        if (!holidayFound) return null

        return holidayFound;
    }
    //DB2
    /*var holidayFound2 = await new Promise((resolve, reject) => {
        ibmdb.open(connStr, async (err, conn) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                try {
                    const data = await conn.query(`SELECT * FROM TECNICO.FERIADO WHERE ID = '${id}'`);
                    conn.close(() => {
                        // console.log('done');
                    });
                    resolve(data[0]);
                } catch (err) {
                    console.log(err);
                    reject(err);
                }
            }
        });
        });
    if(holidayFound) return new holidays(holidayFound.dataValues.nombre, holidayFound.dataValues.fecha, holidayFound.dataValues.id);
    if(holidayFound2) return new holidays(holidayFound.dataValues.NOMBRE, holidayFound.dataValues.FECHA, holidayFound.dataValues.ID);*/


    return null;
    //return holidays.holidays.find((holidays) => holidays.id == id);
}

//devuelve todos los Feriadoss guardados
async function getHolidays() {
    if (dbSelect == "SEQUELIZE") {
        var allHolidays = await Feriados.findAll();

        if (!allHolidays) return null;
        return allHolidays;
    }

    //DB2
    /*var allHolidays2 = await new Promise((resolve, reject) => {
        ibmdb.open(connStr, async (err, conn) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                try {
                    const data = await conn.query(`SELECT * FROM TECNICO.FERIADO`);
                    conn.close(() => {
                        // console.log('done');
                    });
                    resolve(data);
                } catch (err) {
                    console.log(err);
                    reject(err);
                }
            }
        });
        });
    if(!allHolidays) allHolidays = allHolidays2;
    if(!allHolidays2) return null;*/

    return null;
}

async function getHolidaysDate() {
    if (dbSelect == "SEQUELIZE") {
        const allHolidays = await Feriados.findAll();
        let dates = [];
        if (!allHolidays) return null;
        allHolidays.forEach((holiday) => dates.push(holiday.dataValues.fecha_feriado));
        return dates;
    }
    //DB2
    /*var allHolidays2 = await new Promise((resolve, reject) => {
        ibmdb.open(connStr, async (err, conn) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                try {
                    const data = await conn.query(`SELECT * FROM TECNICO.FERIADO`);
                    conn.close(() => {
                        // console.log('done');
                    });
                    resolve(data);
                } catch (err) {
                    console.log(err);
                    reject(err);
                }
            }
        });
        });
    allHolidays2.forEach((holiday) => dates.push(holiday.FECHA));*/
    return null;
    //return holidays.holidays;
}

//elimina un feriado por id
async function deleteOne(id) {
    if (dbSelect == "SEQUELIZE") {
        const deleteHoliday = await Feriados.destroy({
            where: {
                id: id
            },
        });
    }
    //DB2
    /*await new Promise((resolve, reject) => {
        ibmdb.open(connStr, (err, conn) => {
            if (err) {
                console.log(err);
                reject(err);
                return;
            }
            conn.query("DELETE FROM TECNICO.FERIADO WHERE ID = '"+id+"'", async (err, data) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                conn.close(async (err) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                        return;
                    }
                    resolve(data);
                });
            });
        });
    });*/
    /*hol = [];
    for(var i = 0; i < holidays.holidays.length; i++) {
        if (holidays.holidays[i].id != id) {
            hol.push(holidays.holidays[i]);
        }
    }
    //holidays.holidays.forEach((holiday) => {if(holiday.id != id) {hol.push(holidays)}});
    holidays.holidays = hol;
    hol =[];*/
}

//encuentra un feriado por fecha
async function findOneByDate(date) {
    if (dbSelect == "SEQUELIZE") {
        var holidayFound = await Feriados.findOne(
            {
                where: { fecha_feriado: date }
            }
        );
        if (!holidayFound) return null;
        return holidayFound;
    }
    //DB2
    /*var holidayFound2 = await new Promise((resolve, reject) => {
    ibmdb.open(connStr, async (err, conn) => {
        if (err) {
            console.log(err);
            reject(err);
        } else {
            try {
                const data = await conn.query(`SELECT * FROM TECNICO.FERIADO WHERE FECHA = '${date}'`);
                conn.close(() => {
                    // console.log('done');
                });
                resolve(data[0]);
            } catch (err) {
                console.log(err);
                reject(err);
            }
        }
    });
    });*/

    //if(!holidayFound2) return null; 


    /*if(!holidayFound) holidayFound = holidayFound2;
    if(!holidayFound2) return null;*/
    return null;


}

async function updateName(name, id) {
    if (dbSelect == "SEQUELIZE") {
        const holidayFound = await Feriados.findOne(
            {
                where: { id: id }
            }
        );
        if (!holidayFound) return null;

        holidayFound.nombre = name;
        return holidayFound.save();
    }
    return null;
}

async function updateDate(date, id) {
    if (dbSelect == "SEQUELIZE") {
        const holidayFound = await Feriados.findOne(
            {
                where: { id: id }
            }
        );
        if (!holidayFound) return null;

        holidayFound.fecha = date;
        return holidayFound.save();
    }
    return null;
}

export default class holidayFunction {
    holidays = [];

    static getHolidays() {
        return this.holidays;
    }

    static save(holiday) {

        return saveHoliday(holiday);
        //console.log(holidays);
    }

    static findOne(id) {
        return findOne(id);
    }

    static findOneByDate(date) {
        return findOneByDate(date);
    }

    static getHolidays() {
        return getHolidays();
    }

    static deleteOne(id) {
        return deleteOne(id);
    }
    static updateName(name, id) {
        return updateName(name, id)
    }
    static updateDate(date, id) {
        return updateDate(date, id)
    }

    static getHolidaysDate() {
        return getHolidaysDate();
    }

}

//let holidays = new holidayMockup();
let hol = [];
//let day =new Date();
