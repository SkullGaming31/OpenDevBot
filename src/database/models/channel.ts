import mongoose from 'mongoose';
interface IChannel {
    twitchId: string;
    name: string;
    enabled: boolean;
}

const channelSchema = new mongoose.Schema<IChannel>({
  twitchId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    required: true,
    default: false
  },
});

const channelModel = mongoose.model<IChannel>('channel', channelSchema);// channels
export default channelModel;