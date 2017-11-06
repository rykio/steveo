// @flow
import moment from 'moment';
import sqsConf from '../config/sqs';

import BaseProducer from './base';
import type { Configuration, ITask, Logger, IProducer, IRegistry, sqsUrls } from '../../types';

class SqsProducer extends BaseProducer implements IProducer {
  sqsUrls: sqsUrls;

  constructor(config: Configuration, registry: IRegistry, logger: Logger) {
    super(config, registry, logger);
    this.producer = sqsConf.sqs(this.config);
  }

  initialize(topic: ?string) {
    const params = {
      QueueName: topic,
      Attributes: {
        ReceiveMessageWaitTimeSeconds: this.config.receiveMessageWaitTimeSeconds,
        MessageRetentionPeriod: this.config.messageRetentionPeriod,
      },
    };
    return this.producer.createQueueAsync(params).then(data => data && data.QueueUrl);
  }

  getPayload(msg: Object, topic: string) : Object {
    const timestamp: Number = moment().unix();
    const task: ITask = this.registry.getTask(topic);
    const attributes = task ? task.attributes : [];
    const messageAttributes = {
      Timestamp: {
        DataType: 'Number',
        StringValue: timestamp.toString(),
      },
    };
    if (attributes) {
      attributes.forEach((a) => {
        messageAttributes[a.name] = {
          DataType: a.dataType || 'String',
          StringValue: a.value.toString(),
        };
      });
    }

    return {
      MessageAttributes: messageAttributes,
      MessageBody: JSON.stringify(Object.assign({}, msg, { timestamp })),
      QueueUrl: this.sqsUrls[topic],
    };
  }

  async send(topic: string, payload: Object) : Promise<void> {
    try {
      if (!this.sqsUrls[topic]) {
        this.sqsUrls[topic] = await this.initialize(topic);
      }
    } catch (ex) {
      this.logger.error('Error in initalizing sqs', ex);
      throw ex;
    }

    const sqsData = this.getPayload(payload, topic);
    try {
      const data = await this.producer.sendMessageAsync(sqsData);
      this.logger.info('SQS Publish Data', data);
      this.registry.events.emit('producer_success', topic, payload);
    } catch (ex) {
      this.logger.error('Error while sending SQS payload', topic, ex);
      this.registry.events.emit('producer_failure', topic, ex);
      throw ex;
    }
  }
}

export default SqsProducer;
