"""Export GitHub Actions run/job/step timings using the authenticated gh CLI.

Queue time is job created_at -> started_at (not dependency waiting). Preparation,
tests, build and cache are sums of step timestamps; remaining job time is other.
Cancelled/failed runs remain visible and must not be averaged with successful CI.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import csv
from datetime import datetime
import json
from pathlib import Path
import re
import subprocess


def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))


def seconds(start, end):
    if not start or not end:
        return 0
    return max(0, (datetime.fromisoformat(end.replace('Z', '+00:00')) -
                   datetime.fromisoformat(start.replace('Z', '+00:00'))).total_seconds())


def phase(name):
    name = name.lower()
    if re.search(r'cache|post run actions/setup', name):
        return 'cache'
    if re.search(r'checkout|setup-|set up job|install|toolchain|mirror|intel mac target|npm ci', name):
        return 'prepare'
    if re.search(r'test|regression|verify|checks|coverage', name):
        # The existing shell step combines cargo build + cargo test; do not
        # pretend the API can separate them without a workflow/log change.
        return 'test'
    if re.search(r'build|compile|package|helper|sign|publish|notariz', name):
        return 'build'
    return 'other'


def export(runs, output):
    jobs, steps, run_rows = [], [], []
    for run in runs:
        completed = [j['completed_at'] for j in run['jobs'] if j.get('completed_at')]
        end = max(completed, default=run['updated_at'])
        run_rows.append(dict(run_id=run['id'], workflow=run['name'],
                             event=run['event'], conclusion=run['conclusion'],
                             sha=run['head_sha'], created_at=run['created_at'],
                             wall_s=seconds(run['created_at'], end),
                             url=run['html_url']))
        for job in run['jobs']:
            row = dict(run_id=run['id'], workflow=run['name'], job_id=job['id'],
                       job=job['name'], conclusion=job['conclusion'],
                       queue_s=seconds(job.get('created_at'), job['started_at']),
                       dependency_s=seconds(run['created_at'], job.get('created_at')),
                       elapsed_s=seconds(job['started_at'], job['completed_at']),
                       prepare_s=0, test_s=0, build_s=0, cache_s=0, other_s=0)
            measured = 0
            for step in job['steps']:
                duration = seconds(step['started_at'], step['completed_at'])
                category = phase(step['name'])
                row[category + '_s'] += duration
                measured += duration
                steps.append(dict(run_id=run['id'], job_id=job['id'],
                                  job=job['name'], step=step['name'], phase=category,
                                  conclusion=step['conclusion'], elapsed_s=duration))
            row['other_s'] += max(0, row['elapsed_s'] - measured)
            jobs.append(row)
    output.mkdir(parents=True, exist_ok=True)
    (output / 'raw.json').write_text(json.dumps(runs, indent=2) + '\n')
    for name, rows in [('runs', run_rows), ('jobs', jobs), ('steps', steps)]:
        if rows:
            with (output / f'{name}.csv').open('w', newline='') as target:
                writer = csv.DictWriter(target, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
    print(f'Exported {len(runs)} runs, {len(jobs)} jobs, {len(steps)} steps to {output}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repository', default='onevalar/token-plan')
    parser.add_argument('--limit', type=int, default=50)
    parser.add_argument('--run', type=int, action='append', help='Exact run ID (repeatable)')
    parser.add_argument('--runs-file', type=Path, help='Saved gh actions/runs response')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    base = f'repos/{args.repository}/actions/runs'
    if args.run:
        runs = [api(f'{base}/{run}') for run in args.run]
    else:
        response = (json.loads(args.runs_file.read_text()) if args.runs_file else
                    api(f'{base}?per_page={args.limit}'))
        runs = response['workflow_runs'][:args.limit]

    def load_jobs(run):
        result, page = [], 1
        while True:
            batch = api(f'{base}/{run["id"]}/jobs?per_page=100&page={page}')['jobs']
            result.extend(batch)
            if len(batch) < 100:
                break
            page += 1
        return {**run, 'jobs': result}

    with ThreadPoolExecutor(max_workers=6) as pool:
        export(list(pool.map(load_jobs, runs)), args.output)


if __name__ == '__main__':
    main()
