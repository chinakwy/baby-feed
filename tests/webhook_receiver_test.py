"""Run with an isolated Python environment containing receiver requirements."""
import tempfile,os,importlib.util,json,hmac,hashlib
from pathlib import Path
from unittest import TestCase,main
workspace=tempfile.TemporaryDirectory()
os.environ.update(DATA_DIR=workspace.name,WEBHOOK_SECRET='fictional-test-secret')
spec=importlib.util.spec_from_file_location('receiver',Path(__file__).resolve().parents[1]/'scripts/webhook-receiver/webhook_receiver.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
class ReceiverTests(TestCase):
 def send(self,data,headers=None):
  body=json.dumps(data).encode();signature=hmac.new(b'fictional-test-secret',body,hashlib.sha256).hexdigest()
  return r.app.test_client().post('/webhook',data=body,headers={'X-Webhook-Signature':signature,**(headers or {})})
 def test_missing_secret_and_wrong_signature_fail_closed(self):
  self.assertFalse(r.verify_signature(b'{}','', ''))
  self.assertEqual(self.send({'id':'x','type':'memo.created'}, {'X-Webhook-Signature':'wrong'}).status_code,401)
 def test_signed_body_dispatch_and_durable_dedupe(self):
  count=[]
  r.EVENT_HANDLERS['memo.created']=[lambda data:count.append(data['id'])]
  event={'id':'dedupe-one','type':'memo.created','data':{}}
  for _ in range(2):self.assertEqual(self.send(event,{'X-Webhook-Event-Type':'../../bad'}).status_code,200)
  self.assertEqual(count,['dedupe-one'])
  self.assertEqual(self.send({'id':'../../outside','type':'memo.created'}).status_code,400)
  self.assertEqual(self.send({'id':'bad-type','type':[]}).status_code,400)
 def test_failed_handler_not_acknowledged(self):
  def fail(data):raise RuntimeError('fictional failure')
  r.EVENT_HANDLERS['health.created']=[fail]
  self.assertEqual(self.send({'id':'retry-one','type':'health.created'}).status_code,500)
  r.EVENT_HANDLERS['health.created']=[]
  self.assertEqual(self.send({'id':'retry-one','type':'health.created'}).status_code,200)
if __name__=='__main__':main()
