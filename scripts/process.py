import csv
import json
import time
import os.path
from sys import argv
from collections import defaultdict

HOMES_FILE = 'home_locations_ref.txt'
PERSON_FILE = 'persons_ref.txt'
DENDOGRAM_FILE = 'dendogram.txt'
ZIP_COUNTY_FILE = 'zip_county.csv'

OUT_COUNTY_FILE = 'county_pop.csv'

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


# homes = dict()
people = dict()
zip2county = defaultdict(str)
cases_per_day = defaultdict(day_factory)

pop = defaultdict(int)
unknown = []
missing = defaultdict(int)


# Init
dir_name = '../data/ca'
if len(argv) == 2:
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

# print 'read homes'
# t0 = time.clock()
# with open(os.path.join(dir_name, HOMES_FILE), 'rb') as csvfile:
#     f = csv.reader(csvfile, delimiter=' ')
#     f.next()
#     for row in f:
#         homes[row[0]] = (row[9], row[8], row[7])
# t1 = time.clock()
# print'\t',len(homes),'records in',(t1-t0),' secs'

print 'read people'
t0 = time.clock()
n = 0
with open(os.path.join(dir_name, PERSON_FILE), 'rb') as csvfile:
    f = csv.reader(csvfile, delimiter=' ')
    f.next()
    for person in f:
        n += 1
        if n % 1000000 == 0:
            print n
        p_zip = person[2]
        people[person[0]] = (age_group(int(person[1])), p_zip)
        c = zip2county[p_zip]
        if c != '':
            pop[c] += 1
        else:
            missing[p_zip] += 1

t1 = time.clock()
print '\t',len(people),'records in',(t1-t0),' secs'
if len(missing) > 0:
    print '\t missing:', missing.items()

print 'write', OUT_COUNTY_FILE
t0 = time.clock()
with open('../map/assets/'+PREFIX+OUT_COUNTY_FILE, 'wb') as cfile:
    o = csv.writer(cfile)
    o.writerow(['county', 'pop'])
    o.writerows(pop.items())
t1 = time.clock()
print '\t',len(pop),'records in',(t1-t0),' secs'

print 'parse dendogram'
t0 = time.clock()
n = 0
skipped = 0
files = os.listdir(dir_name)
for filename in files:
    if filename[:9] != 'dendogram':
        continue
    print filename
    with open(os.path.join(dir_name, filename), 'rb') as csvfile:
        f = csv.reader(csvfile, delimiter=' ')
        f.next()
        f.next()
        f.next()
        unknown_in_fille = 0
        for row in f:
            if row[4] == "-1":
                continue
            n += 1

            if n % 100000 == 0:
                print n
            day = int(row[2])/86400
            if row[0] not in people:
                unknown_in_fille += 1
                if unknown_in_fille < 10:
                    print 'unknown person:',row[0]
                unknown.append(row[0])
                continue

            person = people[row[0]]
            p_zip = person[1]
            p_county = zip2county[p_zip]
            if p_county != '':
                entry = cases_per_day[day]
                entry['cases'] += 1
                entry_county = entry['counties'][p_county]
                entry_county['cases'] += 1
                entry_county['age'][person[0]] += 1
            else:
                skipped += 1

        if unknown_in_fille > 0:
            print 'unknown people:', unknown_in_fille

t1 = time.clock()
print'\t',n,'records in',(t1-t0),' secs'

print 'days:', len(cases_per_day)

print 'save json'
t0 = time.clock()
with open('../map/assets/'+PREFIX+'cases_per_day.json', 'wb') as f:
    json.dump(cases_per_day, f, sort_keys=True) #indent=2,
t1 = time.clock()
print'\t', (t1-t0), ' secs'

if skipped > 0:
    print '\nskipped:', skipped

if len(unknown) > 0:
    print 'unknown: ',len(unknown)
    with open('unknown.txt', 'wb') as f:
        for item in unknown:
            print>>f, item
