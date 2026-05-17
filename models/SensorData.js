import mongoose from 'mongoose';


const sensorSchema = new mongoose.Schema({
     device_id: {
    type: String,
    required: true
  },
  temperature: {
  type: Number,
  required: true
},
pressure: {
  type: Number,
  required: true
},
    timestamp: {    
        type: Date,
        default: Date.now
    }
})


const sensorData = mongoose.model('Sensor', sensorSchema)
export default sensorData;