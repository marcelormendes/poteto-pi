"""Regression checks for false-positive live-test results; no model calls."""
import json
from pathlib import Path
import tempfile
import unittest

from run import FAST, SECOND, STRONG, TASKS, inspect_run


def jsonl(path, entries):
    path.write_text(''.join(json.dumps(entry)+'\n' for entry in entries))


class ValidationTest(unittest.TestCase):
    def setup_case(self, root, models):
        case=Path(root)/'setup-pstack__validation'
        case.mkdir()
        artifacts=case/'subagent-artifacts'
        artifacts.mkdir()
        jsonl(case/'session.jsonl', [{'message': {'role':'user','content': [{'type':'text','text':'<skill name="setup-pstack">'}]}}])
        jsonl(case/'events.jsonl', [
            {'type':'tool_execution_start','toolName':'subagent','args':{'action':'list'}},
            {'type':'tool_execution_start','toolName':'pstack_status'},
            {'type':'message_end','message':{'role':'assistant','stopReason':'stop','usage':{'output':1},'content':[{'type':'text','text':'done'}]}},
        ])
        for i, model in enumerate(models):
            transcript=artifacts/f'{i}.jsonl'
            provider, _, model_id=model.partition('/')
            jsonl(transcript,[{'recordType':'message','message':{'role':'assistant','provider':provider,'model':model_id.rsplit(':',1)[0],'usage':{'output':1}}}])
            (artifacts/f'{i}_meta.json').write_text(json.dumps({'agent':'pstack-how-explorer','model':model,'exitCode':0,'transcriptPath':str(transcript)}))
        return case

    def test_repeated_working_model_cannot_substitute_for_configured_models(self):
        with tempfile.TemporaryDirectory() as root:
            case=self.setup_case(root,[FAST,FAST,FAST])
            result=inspect_run(case,0,TASKS['setup-pstack'][1])
            self.assertEqual(result['status'],'FAIL')
            self.assertEqual(sum('missing configured model call' in f for f in result['failures']),2)

    def test_all_selected_models_with_real_transcript_evidence_pass(self):
        with tempfile.TemporaryDirectory() as root:
            case=self.setup_case(root,[FAST,STRONG,SECOND])
            self.assertEqual(inspect_run(case,0,TASKS['setup-pstack'][1])['failures'],[])

    def test_metadata_without_model_response_is_not_execution_evidence(self):
        with tempfile.TemporaryDirectory() as root:
            case=self.setup_case(root,[FAST,STRONG,SECOND])
            (case/'subagent-artifacts/0.jsonl').write_text('')
            self.assertEqual(inspect_run(case,0,TASKS['setup-pstack'][1])['status'],'FAIL')

    def test_assistant_claim_cannot_fake_skill_loading(self):
        with tempfile.TemporaryDirectory() as root:
            case=self.setup_case(root,[FAST,STRONG,SECOND])
            jsonl(case/'session.jsonl',[{'message':{'role':'assistant','content':[{'type':'text','text':'<skill name="setup-pstack">'}]}}])
            self.assertIn('Pi did not load the requested skill',inspect_run(case,0,TASKS['setup-pstack'][1])['failures'])

    def test_prose_only_behavioral_case_fails(self):
        with tempfile.TemporaryDirectory() as root:
            case=Path(root)/'blast-radius__validation'
            case.mkdir()
            jsonl(case/'session.jsonl',[{'message':{'role':'user','content':[{'type':'text','text':'<skill name="blast-radius">'}]}}])
            jsonl(case/'events.jsonl',[{'type':'message_end','message':{'role':'assistant','stopReason':'stop','usage':{'output':10},'content':[{'type':'text','text':'Everything looks fine.'}]}}])
            result=inspect_run(case,0,[])
            self.assertEqual(result['status'],'FAIL')
            self.assertIn('missing required evidence tool: bash',result['failures'])


if __name__=='__main__':
    unittest.main()
