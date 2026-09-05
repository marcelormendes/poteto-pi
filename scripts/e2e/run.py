#!/usr/bin/env python3
"""Live Pi package checks. Evidence is retained; credentials stay in a private agent dir."""
import argparse
import concurrent.futures
import json
import os
import re
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import uuid

REPO = Path(__file__).resolve().parents[2]
FAST = 'opencode-go/glm-5.3-flash:low'
STRONG = 'openai-codex/gpt-5.6-sol:low'
SECOND = 'opencode-go/deepseek-v4-flash:low'
COMPANIONS = ['pi-subagents@0.64.0', 'pi-mcp-adapter@2.32.1', '@narumitw/pi-goal@0.54.4', 'pi-web-access@0.27.0']
NOTES = '''import json, os, sys
from pathlib import Path

def main(args):
    db = Path(os.environ.get("NOTES_DB", "notes.json"))
    notes = json.loads(db.read_text()) if db.exists() else []
    if args and args[0] == "add" and len(args) == 2:
        notes.append(args[1])
        db.write_text(json.dumps(notes))
        print(json.dumps(notes))
        return 0
    if args == ["list"]:
        print(json.dumps(notes))
        return 0
    print("usage: notes.py add TEXT | list", file=sys.stderr)
    return 2

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
'''
TESTS = '''import json, os, subprocess, sys, tempfile, unittest
from pathlib import Path

class NotesTest(unittest.TestCase):
    def test_add_and_list(self):
        with tempfile.TemporaryDirectory() as root:
            env = dict(os.environ, NOTES_DB=str(Path(root) / "notes.json"))
            subprocess.run([sys.executable, "notes.py", "add", "alpha"], env=env, check=True, capture_output=True)
            result = subprocess.run([sys.executable, "notes.py", "list"], env=env, check=True, capture_output=True, text=True)
            self.assertEqual(json.loads(result.stdout), ["alpha"])

if __name__ == "__main__":
    unittest.main()
'''
TASKS = {
    'setup-pstack': ('Configure this isolated Pi installation. Model choices are pre-approved for every role: use opencode-go/glm-5.3-flash:low for fast, explorer, swarm, feature and refactoring roles; openai-codex/gpt-5.6-sol:low for judgment, explainer, synthesis, bug-fix, perf, hillclimb, hardest and reflect roles. Every panel has two entries: openai-codex/gpt-5.6-sol:low and opencode-go/deepseek-v4-flash:low. Required and optional companion installation and guardrail changes are authorized in PI_CODING_AGENT_DIR only. Verify all selected models with real children, role discovery and pstack_status. Do not generate a verification skill yet.', ['pstack-how-explorer'] * 3),
    'how': ('Explain and critique the complete notes CLI: command parsing, file storage, and tests. Run the configured explorer/explainer and critics where the skill prescribes them. Cite code.', ['pstack-how-explainer', 'pstack-how-critics-1', 'pstack-how-critics-2']),
    'why': ('Why does this CLI use a configurable JSON file instead of a database server? Investigate local Git history and repository evidence only; no external MCP sources are in scope. Distinguish direct evidence from inference.', ['pstack-why-investigator', 'pstack-why-synthesizer']),
    'interrogate': ('Adversarially review notes.py and test_notes.py. The intent is a tiny local notes CLI that appends and lists JSON notes. Use both configured reviewers with the same rubric; make no edits.', ['pstack-interrogate-reviewers-1', 'pstack-interrogate-reviewers-2']),
    'swarm': ('Use two read-only workers: one checks command behavior, the other checks persistence and tests. Complete coverage of both slices, return one evidence-backed report. Do not modify product files.', ['pstack-swarm-worker', 'pstack-swarm-worker']),
    'architect': ('Design a minimal backward-compatible delete-by-index command for notes.py. Sketch only; compare two configured runner proposals. Include caller examples and invalid-index behavior. Do not implement.', ['pstack-architect-runners-1', 'pstack-architect-runners-2']),
    'arena': ('Compare two implementations of a --version command returning 1.0.0 in notes.py. Run both configured candidates in managed worktrees with gate python3 -m unittest -v, then a contrasting cross-judge. You may choose and integrate the winner into this fixture. Verify the actual CLI and retain the synthesis. Local fixture commits and worktrees are authorized; no remote Git actions.', ['pstack-arena-runners-1', 'pstack-arena-runners-2', 'pstack-arena-cross-judges-']),
    'poteto-mode': ('Fix notes.py accepting blank notes. First reproduce with the real CLI. Reject empty or whitespace-only notes with exit 2 and no storage mutation, preserve nonempty note text exactly. Add a regression test and verify the real CLI plus python3 -m unittest -v. If .pi/skills/verify-notes exists, read and execute that generated project verification workflow as a completion gate too. This is local work only, no PR or publication. Integrating delegated fixes into this fixture is authorized.', ['pstack-how-explainer', 'pstack-bug-fix']),
    'tdd': ('Reject empty or whitespace-only notes with exit 2 and no storage mutation. Preserve nonempty notes exactly. Use red-green-refactor and run python3 -m unittest -v plus real CLI checks. Keep the failing-before/passing-after evidence.', []),
    'create-verification-skill': ('Create and prove a project-local verify-notes skill for this notes CLI. Cover add, list, and invalid command. Run its generated instructions, retain evidence after cleanup. No external services or publication.', []),
    'maintain-verification-skill': ('Audit the existing .pi/skills/verify-notes skill and its feature map. Drive every mapped feature, fix only proven skill drift, and keep proof after cleanup. Local changes only; do not create a PR.', ['pstack-how-explorer']),
    'no-comments': ('Review only comments.py with the independent Comment Sicko role. Delete narrating comments, preserve its license and public API contract. Apply only proven in-scope changes and run python3 comments.py. No broader refactor is needed.', ['pstack-comment-sicko']),
    'reflect': ('Review the supplied completed task record in history.md. Run all three lenses and the configured synthesizer. Return accepted/rejected/backlog recommendations. Recommendations only: no skill edits, tracker submissions, messages, or external actions.', ['pstack-reflect-tooling', 'pstack-reflect-judgment', 'pstack-reflect-divergent', 'pstack-reflect-synthesizer']),
    'recall': ('Reconstruct the recent notes project decision about JSON storage from the current-project Pi transcripts. Cite session ids. Do not read any other project.', []),
    'teach': ('Teach me how notes.py stores and lists notes and why it uses a file. Use the local Git history; no external evidence is in scope. Give a plain explanation with a small diagram.', ['pstack-how-explainer', 'pstack-why-investigator', 'pstack-why-synthesizer']),
    'blast-radius': ('Assess changing notes.py so blank notes are rejected. Prove the key compatibility assumption with actual CLI runs. Report callers, tests, risks, and what is safe; make no product changes.', []),
    'figure-it-out': ('Design a bounded verification plan for checking this local CLI across valid input, blank input, corrupt storage and concurrent writers. Deliver the plan in PLAN.md; do not implement or publish it. Read the relevant principles and name concrete gates.', []),
    'automate-me': ('Create a project-local marcel-mode skill from history.md and the current-project transcript evidence. I explicitly authorize creating this skill. Keep only repeated evidenced preferences; no external history or publication. Run any validation you can locally.', []),
    'show-me-your-work': ('Create a decision trail for evaluating whether notes.py should reject blank input. Read the code, run a real blank-input probe, record observation and decision with the bundled logging helper, and get the required independent review. No product edits or remote actions.', ['pstack-judgment-prose']),
    'loop': ('Run exactly three independent CLI add/list round-trips with separate temporary NOTES_DB files, stop when all three pass, cap three iterations, abort on failure. Keep each result and clean temporary data.', []),
    'bro': ('Restate this plainly without losing its meaning: The persistence layer leverages a JSON-serialized append-only collection, and the environment variable delineates the storage boundary. Return only the rewrite.', []),
    'unslop': ('Rewrite this into result.txt, preserving the concrete facts: It is important to note that our robust CLI leverages a seamless JSON persistence layer. Delve into its powerful capabilities: add stores a note, while list returns all notes. In conclusion, this fosters productivity.', []),
    'technical-writing': ('Write GUIDE.md for the notes CLI: installation prerequisites, a short add/list tutorial using an isolated NOTES_DB path, command reference and failure behavior. Verify the commands. Keep the guide concise.', []),
    'typescript-best-practices': ('Review boundary.ts. Explain its type-safety defect and write a safe replacement in boundary-fixed.ts with a discriminated result type and a parser for unknown input. Run a Bun runtime probe for valid and invalid input.', []),
}


def events(path):
    if not path.exists():
        return []
    result = []
    for line in path.read_text(errors='replace').splitlines():
        try:
            result.append(json.loads(line))
        except ValueError:
            continue
    return result


def command(argv, cwd, env, out, timeout=120):
    with out.open('w') as stdout, out.with_suffix('.stderr').open('w') as stderr:
        proc = subprocess.Popen(argv, cwd=cwd, env=env, stdout=stdout, stderr=stderr, start_new_session=True)
        try:
            return proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGINT)
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait()
            return 124


def seed(work, root):
    work.mkdir(parents=True)
    (work/'notes.py').write_text(NOTES)
    (work/'test_notes.py').write_text(TESTS)
    (work/'README.md').write_text('# Notes\n\nLocal CLI: python3 notes.py add TEXT; python3 notes.py list.\nNOTES_DB selects the JSON storage file (default notes.json).\nTests: python3 -m unittest -v. Python 3, no external dependencies.\nBlank notes currently slip through and are a known defect.\n')
    (work/'.gitignore').write_text('notes.json\n__pycache__/\n.pi/\n')
    (work/'comments.py').write_text('# Copyright 2026 Notes contributors. MIT license.\n\n# Define a function\ndef double(value):\n    """Return twice the input value."""\n    # Multiply by two\n    return value * 2\n\nassert double(4) == 8\n')
    (work/'boundary.ts').write_text('export function nameOf(value: any): string { return value.name as string; }\n')
    history = '# Completed task record\n\nThe operator repeatedly requested real CLI reproduction before editing.\nTask 1: an agent guessed the JSON path; the operator corrected it to NOTES_DB, then required a CLI add/list proof.\nTask 2: the operator rejected a broad storage abstraction and requested a direct JSON-file solution for a single-user offline tool.\nTask 3: an agent said tests passed without running them; the operator required command output and preserved evidence.\nAll three tasks ended with small fixes, local unittest and real CLI evidence.\nDecision: JSON storage keeps installation dependency-free for a single-user offline CLI; concurrency is not guaranteed.\n'
    (work/'history.md').write_text(history)
    for argv in (['git','init','-q'], ['git','add','.'], ['git','-c','user.name=Pi E2E','-c','user.email=pi-e2e@localhost','commit','-qm','Use a JSON file for a dependency-free single-user offline CLI; NOTES_DB isolates tests']):
        subprocess.run(argv,cwd=work,check=True,capture_output=True)
    sessions=root/'agent'/'sessions'/('fixture-'+work.parent.name)
    sessions.mkdir(parents=True,exist_ok=True)
    session=[{'type':'session','version':3,'id':'fixture-'+work.parent.name,'timestamp':'2026-09-04T00:00:00Z','cwd':str(work.resolve())}, {'type':'message','id':'history','parentId':None,'timestamp':'2026-09-04T00:00:01Z','message':{'role':'user','content':[{'type':'text','text':history}],'timestamp':1788480001000}}]
    (sessions/'history.jsonl').write_text('\n'.join(json.dumps(e) for e in session)+'\n')


def inspect_run(case, code, expected):
    parent=events(case/'events.jsonl')
    assistants=[e['message'] for e in parent if e.get('type')=='message_end' and e.get('message',{}).get('role')=='assistant']
    calls=[{'tool':e.get('toolName'),'args':e.get('args',{})} for e in parent if e.get('type')=='tool_execution_start']
    failures=[]
    if code: failures.append(f'Pi exit {code}')
    skill = case.name.split('__')[0]
    session = events(case/'session.jsonl')
    if not skill.startswith('roles'):
        if not any(f'<skill name="{skill}"' in part.get('text','') for event in session if event.get('message',{}).get('role')=='user'
                   for part in event.get('message',{}).get('content',[]) if isinstance(part,dict)):
            failures.append('Pi did not load the requested skill')
    if not any(m.get('stopReason')=='stop' and m.get('usage',{}).get('output',0)>0 for m in assistants): failures.append('no completed parent model response')
    for m in assistants:
        if m.get('stopReason') in ('error','aborted'): failures.append(m.get('errorMessage',m['stopReason']))
    children=[]
    for path in (case/'subagent-artifacts').glob('*_meta.json'):
        meta=json.loads(path.read_text())
        transcript=events(Path(meta.get('transcriptPath','/missing')))
        replies=[e.get('message',{}) for e in transcript if (e.get('type')=='message' or e.get('recordType')=='message') and e.get('message',{}).get('role')=='assistant']
        if not replies:
            replies=[e.get('message',{}) for e in transcript if e.get('type')=='message_end' and e.get('message',{}).get('role')=='assistant']
        provider, _, model = meta.get('model','').partition('/')
        model_id = model.rsplit(':',1)[0]
        called=any(m.get('usage',{}).get('output',0)>0 and m.get('model') == model_id
                   and m.get('provider') == provider for m in replies)
        child={'agent':meta.get('agent'),'model':meta.get('model'),'exitCode':meta.get('exitCode'),'called':called,'transcript':str(meta.get('transcriptPath','')),'metadata':str(path),'error':meta.get('error'),'outputTokens':meta.get('usage',{}).get('output',0)}
        children.append(child)
        if meta.get('exitCode')!=0 or not called: failures.append('child failed or has no model evidence: '+str(meta.get('agent')))
    remaining=list(children)
    for name in expected:
        match=next((c for c in remaining if c['agent']==name or (name.endswith('-') and c['agent'].startswith(name))),None)
        if match: remaining.remove(match)
        else: failures.append('missing child: '+name)
    model_contracts = {
        'setup-pstack': [('pstack-how-explorer', model) for model in (FAST, STRONG, SECOND)],
        'how': [('pstack-how-critics-1', STRONG), ('pstack-how-critics-2', SECOND)],
        'interrogate': [('pstack-interrogate-reviewers-1', STRONG), ('pstack-interrogate-reviewers-2', SECOND)],
        'architect': [('pstack-architect-runners-1', STRONG), ('pstack-architect-runners-2', SECOND)],
        'arena': [('pstack-arena-runners-1', STRONG), ('pstack-arena-runners-2', SECOND)],
    }
    for agent, model in model_contracts.get(skill, []):
        if not any(c['agent']==agent and c['model']==model and c['called'] and c['exitCode']==0 for c in children):
            failures.append(f'missing configured model call: {agent} on {model}')
    final='\n'.join(p.get('text','') for m in assistants if m.get('stopReason')=='stop' for p in m.get('content',[]) if p.get('type')=='text')
    (case/'answer.md').write_text(final)
    work = case/'work'
    tool_names = {c['tool'] for c in calls}
    if skill.startswith('principle-') or skill in ('blast-radius','loop','tdd','technical-writing','typescript-best-practices','create-verification-skill','maintain-verification-skill'):
        for tool in ('read','bash'):
            if tool not in tool_names: failures.append('missing required evidence tool: '+tool)
    if skill.startswith('principle-'):
        for path, content in [('notes.py', NOTES), ('test_notes.py', TESTS)]:
            if (work/path).read_text()!=content: failures.append('principle case modified product file: '+path)
    if skill == 'setup-pstack':
        if 'pstack_status' not in tool_names: failures.append('setup did not run pstack_status')
        if not any(c['tool']=='subagent' and c['args'].get('action')=='list' for c in calls):
            failures.append('setup did not discover roles')
    if skill == 'bro':
        if len(final.split())>60 or not all(word in final.lower() for word in ('json','list','environment','stor')):
            failures.append('rewrite lost the storage facts or was not concise')
    if skill == 'arena':
        with tempfile.TemporaryDirectory(prefix='pstack-arena-assert-') as scratch:
            db=Path(scratch)/'untouched.json'
            db.write_text('invalid JSON canary')
            result=subprocess.run(['python3','notes.py','--version'],cwd=work,env=dict(os.environ,NOTES_DB=str(db)),capture_output=True,text=True)
            if result.returncode or result.stdout!='1.0.0\n' or result.stderr or db.read_text()!='invalid JSON canary':
                failures.append('integrated arena winner failed independent CLI/storage check')
        result=subprocess.run(['python3','-m','unittest','-v'],cwd=work,capture_output=True,text=True)
        (case/'assert-tests.txt').write_text(result.stdout+result.stderr)
        if result.returncode: failures.append('arena winner failed independent regression suite')
    if skill in ('poteto-mode','tdd'):
        with tempfile.TemporaryDirectory(prefix='pstack-assert-') as scratch:
            db=Path(scratch)/'notes.json'
            env=dict(os.environ,NOTES_DB=str(db))
            for text in ('','   '):
                result=subprocess.run(['python3','notes.py','add',text],cwd=work,env=env,capture_output=True,text=True)
                if result.returncode!=2 or db.exists(): failures.append('blank input changed storage or did not exit 2')
            db.write_text('["existing"]')
            for text in ('','   '):
                result=subprocess.run(['python3','notes.py','add',text],cwd=work,env=env,capture_output=True,text=True)
                if result.returncode!=2 or db.read_text()!='["existing"]': failures.append('blank input mutated existing storage')
            db.unlink()
            result=subprocess.run(['python3','notes.py','add','  keep  '],cwd=work,env=env,capture_output=True,text=True)
            if result.returncode or json.loads(result.stdout)!=['  keep  ']: failures.append('valid note text was not preserved')
            result=subprocess.run(['python3','-m','unittest','-v'],cwd=work,capture_output=True,text=True)
            (case/'assert-tests.txt').write_text(result.stdout+result.stderr)
            if result.returncode: failures.append('independent fixture test run failed')
    required_files = {'unslop':['result.txt'], 'technical-writing':['GUIDE.md'], 'figure-it-out':['PLAN.md'],
                      'typescript-best-practices':['boundary-fixed.ts'],
                      'create-verification-skill':['.pi/skills/verify-notes/SKILL.md','.pi/skills/verify-notes/features/README.md']}
    for path in required_files.get(skill,[]):
        if not (work/path).is_file() or not (work/path).stat().st_size: failures.append('missing artifact: '+path)
    if skill == 'automate-me' and not list((work/'.pi/skills').glob('**/marcel-mode/SKILL.md')):
        failures.append('missing generated marcel-mode skill')
    if skill == 'recall' and 'pstack_transcripts' not in [c['tool'] for c in calls]:
        failures.append('transcript lookup tool was not exercised')
    if skill == 'no-comments':
        comments=(work/'comments.py').read_text()
        if '# Define a function' in comments or '# Multiply by two' in comments or '# Copyright' not in comments:
            failures.append('comment cleanup missed narration or removed the license')
        if subprocess.run(['python3','comments.py'],cwd=work,capture_output=True).returncode:
            failures.append('comment cleanup broke executable behavior')
    if skill == 'loop' and 'pstack_todo' not in [c['tool'] for c in calls]:
        failures.append('loop did not track its bounded iterations')
    summary={'case':case.name,'status':'FAIL' if failures else 'PASS','failures':failures,'parentModels':sorted({m.get('provider','')+'/'+m.get('model','') for m in assistants}),'parentOutputTokens':sum(m.get('usage',{}).get('output',0) for m in assistants),'tools':[c['tool'] for c in calls],'children':children,'answer':str(case/'answer.md')}
    (case/'result.json').write_text(json.dumps(summary,indent=2)+'\n')
    return summary


def run_case(root, env, name, task, expected, parent, timeout):
    case=root/'cases'/name
    if case.exists():
        raise RuntimeError(f'Evidence already exists at {case}; choose a fresh --run-label')
    case.mkdir(parents=True)
    work=case/'work'
    seed(work,root)
    if name.startswith(('maintain-verification-skill','poteto-mode')):
        sources=list((root/'cases').glob('create-verification-skill*/work/.pi/skills/verify-notes'))
        sources=[path for path in sources if (path.parents[3]/'result.json').is_file()
                 and json.loads((path.parents[3]/'result.json').read_text()).get('status')=='PASS']
        sources.sort(key=lambda path: (path.parents[3]/'result.json').stat().st_mtime)
        if not sources and name.startswith('maintain-verification-skill'): raise RuntimeError('Run create-verification-skill first')
        if sources: shutil.copytree(sources[-1],work/'.pi/skills/verify-notes')
    skill=name.split('__')[0]
    if skill.startswith('principle-'):
        task='Evaluate this principle against notes.py and test_notes.py. Read both, run the existing CLI and tests, and return one concrete decision, evidence, and a smallest useful next step. Apply it only where it fits; saying it does not justify a change is valid. Preserve the public contract: add appends even duplicate text and prints the full JSON list; list prints all notes. This is a single-user offline tool with no concurrent-writer guarantee. Do not invent new product requirements to demonstrate a principle. Do not edit product files or publish anything.'
    scope=f'\n\nThis is an authorized local E2E fixture at {work}. Follow the invoked skill. You may use real models and local subagents, create temporary files, and make local fixture commits/worktrees as needed. No pushes, PRs, deployments, external messages, or tracker writes. Do not edit the installed plugin or other projects. Configuration lives only at {root / "agent"}; resolve PI_CODING_AGENT_DIR instead of the default home. Preserve test evidence under {case}. Limit work to this small fixture. Do not claim a child ran without inspecting its result.'
    prompt=(f'/skill:{skill} '+task+scope) if not skill.startswith('roles') else task+scope
    (case/'prompt.txt').write_text(prompt)
    code=command(['pi','--approve','--model',parent,'--thinking','low','--mode','json','--session',str(case/'session.jsonl'),'-p',prompt],work,env,case/'events.jsonl',timeout)
    result=inspect_run(case,code,expected)
    print(json.dumps({'case':name,'status':result['status'],'children':len(result['children']),'failures':result['failures']}),flush=True)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path)
    parser.add_argument('--prepare',action='store_true')
    parser.add_argument('--skills',default='')
    parser.add_argument('--roles',default='')
    parser.add_argument('--parent-model',default='openai-codex/gpt-5.6-sol')
    parser.add_argument('--timeout',type=int,default=420)
    parser.add_argument('--jobs',type=int,default=2)
    parser.add_argument('--run-label',default='')
    args=parser.parse_args()
    root=(args.root or Path(tempfile.mkdtemp(prefix='poteto-e2e-'))).absolute()
    root.mkdir(parents=True,exist_ok=True)
    env={**os.environ,'PI_CODING_AGENT_DIR':str(root/'agent'),'PI_OFFLINE':'1','PI_TELEMETRY':'0','PI_SUBAGENTS_TEMP_ROOT':str(root/'subagents')}
    if args.prepare:
        agent=root/'agent';agent.mkdir(mode=0o700,exist_ok=True)
        auth_source=Path(os.environ.get('PI_CODING_AGENT_DIR',str(Path.home()/'.pi/agent')))/'auth.json'
        auth=json.loads(auth_source.read_text())
        auth_file=agent/'auth.json'
        if not auth_file.exists():
            fd=os.open(auth_file,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
            with os.fdopen(fd,'w') as stream:
                json.dump({key:value for key,value in auth.items() if key in ('opencode-go','openai-codex')},stream)
        for i,source in enumerate([str(REPO)]+['npm:'+p for p in COMPANIONS]):
            code=command(['pi','install',source],root,env,root/f'install-{i}.log')
            if code: raise RuntimeError(f'Install failed: {source}; see {root}/install-{i}.log')
    if not (root/'agent/settings.json').exists(): parser.error('Use --prepare or select an existing isolated --root')
    print('Evidence root: '+str(root),flush=True)
    selected=sorted(p.parent.name for p in (REPO/'skills').glob('*/SKILL.md')) if args.skills=='all' else [s for s in args.skills.split(',') if s]
    if args.run_label and not re.fullmatch(r'[A-Za-z0-9_-]+',args.run_label): parser.error('--run-label must contain only letters, numbers, underscores, or hyphens')
    cases=[]
    for skill in selected:
        if skill not in TASKS and not skill.startswith('principle-'): raise RuntimeError('No behavioral case for '+skill)
        task,expected=TASKS.get(skill,('',[]))
        cases.append((skill,task,expected))
    if args.roles:
        roles=sorted(p.stem for p in (REPO/'agents').glob('*.md')) if args.roles=='all' else args.roles.split(',')
        for index in range(0,len(roles),4):
            batch=roles[index:index+4]
            runs=[{'key':'role-'+str(i),'agent':role,'model':[FAST,STRONG,SECOND][i%3],'context':'fresh','task':'Reply exactly role-smoke-ok without tools.'} for i,role in enumerate(batch)]
            script='const results = await runs.all('+json.dumps(runs)+'); return results.map(r => ({key:r.key,ok:r.ok,output:r.output,outputReference:r.outputReference}));'
            task='Execute this subagent workflowScript exactly, await all results, and report failure if any child fails: '+script
            cases.append(('roles-'+str(index//4+1),task,batch))
    suffix=('__'+args.run_label) if args.run_label else ''
    results=[]
    ordered = ['setup-pstack', 'create-verification-skill', 'maintain-verification-skill', 'poteto-mode']
    for name in ordered:
        match = next((case for case in cases if case[0] == name), None)
        if match:
            cases.remove(match)
            results.append(run_case(root,env,name+suffix,match[1],match[2],args.parent_model,args.timeout))
            if results[-1]['status'] != 'PASS':
                raise SystemExit(f'{name} failed; inspect {root}/cases/{name+suffix}/result.json before dependent checks')
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,args.jobs)) as pool:
        futures=[pool.submit(run_case,root,env,name+suffix,task,expected,args.parent_model,args.timeout) for name,task,expected in cases]
        for future in concurrent.futures.as_completed(futures): results.append(future.result())
    report=root/('results'+suffix+'-'+uuid.uuid4().hex[:8]+'.json')
    report.write_text(json.dumps(results,indent=2)+'\n')
    print(f'{sum(r["status"]=="PASS" for r in results)}/{len(results)} cases passed; {report}',flush=True)
    raise SystemExit(1 if any(r['status']!='PASS' for r in results) else 0)

if __name__=='__main__':
    main()
