import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { ExampleHomebridgePlatform } from './platform';
import * as net from 'net';
import TuyAPI from 'tuyapi';

export class ExamplePlatformAccessory {
  private service: Service;
  private client: net.Socket;
  private device: TuyAPI;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
  };

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    this.client = new net.Socket();
    this.device = new TuyAPI({
      id: 'd7ff5628727aa0a67197f9',
      key: '7033b96246d13311',
      ip: '192.168.1.53',
      version: '3.3',
      issueRefreshOnConnect: true,
    });

    this.device.find().then(() => {
      // Connect to device
      this.device.connect();
    });

    this.device.on('connected', () => {
      this.platform.log.info('Connected to device!');
    });

    this.device.on('data', (data) => {
      this.platform.log.debug('data:- ', data);
      this.handleTuyaData(data);
    });

    this.platform.log.info('this constructor is created');
  }


  private handleTuyaData(data) {
    // Extract the 'dps' object from the data
    this.platform.log.info('this handleTuyaData is called');
    const dps = data.dps;
    // Check the value of '1' to determine the switch state
    if (dps['1'] === false) {
      // Tuya device is "off," set Homebridge switch to off
      this.setOn(false);
    } else if (dps['1'] === true) {
      // Tuya device is "on," set Homebridge switch to on
      this.setOn(true);
    }

    // Log the received data
    this.platform.log.info('Received data from Tuya device:', data);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.platform.log.info('set to on/off', value);
    this.exampleStates.On = value as boolean;

    this.platform.log.debug('Set Characteristic On ->', value);
    this.sendValueToServer(value);
  }

  private sendValueToServer(value: CharacteristicValue) {
    const SERVER_IP = '192.168.1.211';
    const SERVER_PORT = 8980;

    this.client.connect(SERVER_PORT, SERVER_IP, () => {
      this.platform.log.info('Connected to the server');

      const dataToSend = value ? 'on' : 'off';

      this.client.write(dataToSend);

      this.client.end(); // Close the connection after sending data
    });

    this.client.on('error', (error) => {
      this.platform.log.error('Socket error:', error);
    });
  }


  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.exampleStates.On;
    this.platform.log.debug('Get Characteristic On ->', isOn);

    return isOn;
  }

}
