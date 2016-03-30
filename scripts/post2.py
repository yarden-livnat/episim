import csv
import json
import time
import os.path
from sys import argv
from collections import defaultdict

DENDOGRAM_FILE = 'dendogram.txt'
ZIP_COUNTY_FILE = 'zip_county.csv'

AGE_GROUPS = [1, 6, 13, 19, 64]
AGE_GROUPS_LEN = len(AGE_GROUPS)


def age_group(age):
    for i in range(AGE_GROUPS_LEN):
        if age < AGE_GROUPS[i]:
            return i
    else:
        return AGE_GROUPS_LEN


def county_factory():
    c = dict()
    c['cases'] = 0
    c['age'] = [0]*(AGE_GROUPS_LEN+1)
    return c


def day_factory():
    d = dict()
    d['cases'] = 0
    d['counties'] = defaultdict(county_factory)
    return d


zip2county = defaultdict(str)
cases_per_day = defaultdict(day_factory)

unknown = []

# Init
if len(argv) != 2:
    print 'Usage: ', argv[0], '<path to dataset directory>'
    exit(0)

dir_name = argv[1]
PREFIX = os.path.basename(dir_name) + '-'

if dir_name[-1] != '/':
    dir_name += '/'

# process
print 'read zip_county'
t0 = time.clock()
with open(ZIP_COUNTY_FILE, 'rb') as zipfile:
    f = csv.reader(zipfile)
    f.next()
    for row in f:
        zip2county[row[0]] = int(row[1])
t1 = time.clock()
print'\t',len(zip2county),'records in',(t1-t0),' secs'


print 'parse dendogram'
t0 = time.clock()
n = 0
skipped = 0
files = os.listdir(dir_name)
for filename in files:
    if filename[:9] != 'dendogram':
        continue
    # print filename
    with open(os.path.join(dir_name, filename), 'rb') as csvfile:
        f = csv.reader(csvfile, delimiter=' ')
        f.next()
        f.next()
        f.next()
        for row in f:
            n += 1

            if n % 5000000 == 0:
                print n
            day = int(row[3])/86400
            p_zip = row[2]
            p_county = zip2county[p_zip]
            if p_county != '':
                entry = cases_per_day[day]
                entry['cases'] += 1
                entry_county = entry['counties'][p_county]
                entry_county['cases'] += 1
                entry_county['age'][age_group(int(row[1]))] += 1
            else:
                skipped += 1

t1 = time.clock()
print '\t',n,'records in',(t1-t0),' secs'
if skipped > 0:
    print '\t',unknown,'unknown zipcodes'

print 'save json'
t0 = time.clock()
with open(os.path.join(dir_name, 'cases_per_day.json'), 'wb') as f:
    json.dump(cases_per_day, f, sort_keys=True) #indent=2,
t1 = time.clock()
print'\t', (t1-t0), ' secs'

print 'done'
# if skipped > 0:
#     print '\nskipped:', skipped


