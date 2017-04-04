import { expect } from 'chai';
import sinon from 'sinon';
import Producer from '../src/producer';

describe('Producer', () => {
  it('should initialize', async () => {
    const p = Producer({}, console);
    const initStub = sinon.stub(p.producer, 'init').returns(Promise.resolve());
    await p.initialize();
    expect(initStub.callCount).to.equal(1);
  });

  it('should send', async () => {
    const p = Producer({}, console);
    const sendStub = sinon.stub(p.producer, 'send').returns(Promise.resolve());
    await p.send('test-topic', { a: 'payload' });
    expect(sendStub.callCount).to.equal(1);
  });

  it('should logg error on failure', async () => {
    const p = Producer({}, console);
    const sendStub = sinon.stub(p.producer, 'send').returns(Promise.reject());
    let err;
    try {
      await p.send('test-topic', { a: 'payload' });
    } catch (ex) {
      err = true;
      expect(sendStub.callCount).to.equal(1);
    }
    expect(err).to.equal(true);
  });
});
