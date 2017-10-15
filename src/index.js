// @flow
import 'babel-polyfill';

import kafka from 'no-kafka';
import NULL_LOGGER from 'null-logger';
import Task from './task';
import Registry from './registry';
import runner from './runner';
import metric from './metric';
import producer from './producer';
import Config from './config';
import { build } from './pool';

import type { ITask, Configuration, Callback, IProducer, Pool, Logger, ISteveo, IRegistry, IEvent, IMetric, Attribute } from '../types';

class Steveo implements ISteveo {
  config: Configuration;
  logger: Logger;
  registry: IRegistry;
  producer: IProducer;
  metric: IMetric;
  events: IEvent;
  pool: Pool;

  constructor(configuration: Configuration, logger: Logger = NULL_LOGGER) {
    this.config = new Config(configuration);
    this.logger = logger;
    this.registry = Registry.getInstance();
    this.metric = metric(this.config.engine, this.config, this.logger);
    this.pool = build(this.config.workerConfig);
    this.producer = producer(this.config.engine, this.config, this.registry, this.logger);
    this.registry.producer = producer;
    this.events = this.registry.events;
  }

  task(name: string, callback: Callback, attributes: Array<Attribute> = []): ITask {
    const task = new Task(name, callback, this.registry, attributes);
    return task;
  }

  runner() {
    return runner(this.config.engine, this.config, this.registry, this.pool, this.logger);
  }

  customTopicName = (callback: Callback) => {
    Registry.getInstance().topicName = callback;
  };

  metric() {
    return this.metric;
  }
}

export default Steveo;
export const builder = (config: Configuration, logger: Logger) => new Steveo(config, logger);

export const decorate = (handler: Callback) => {
  const method = handler;
  const { taskName } = method;
  const task = new Task(taskName, handler, Registry.getInstance());
  method.task = task;
  method.publish = handler.task.publish.bind(task);
  method.subscribe = handler;
  return method;
};

export const kafkaCompression = {
  SNAPPY: kafka.COMPRESSION_SNAPPY,
  GZIP: kafka.COMPRESSION_GZIP,
  NONE: kafka.COMPRESSION_NONE,
};

