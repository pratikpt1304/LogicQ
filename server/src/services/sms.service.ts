export interface SmsOptions {
  to: string;
  message: string;
}

export interface ISmsService {
  sendSms(options: SmsOptions): Promise<boolean>;
}

class ConsoleSmsService implements ISmsService {
  async sendSms(options: SmsOptions): Promise<boolean> {
    console.log('\n================== [LOGICQ SMS / MOBILE SERVICE] ==================');
    console.log(`TO:      ${options.to}`);
    console.log('------------------------- MESSAGE -------------------------');
    console.log(options.message);
    console.log('===================================================================\n');
    return true;
  }
}

export const smsService: ISmsService = new ConsoleSmsService();
