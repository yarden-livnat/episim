import csv
import json
import time
from collections import defaultdict

STATE = 'ca'
HOMES_FILE = 'home_locations_ref.txt'
PERSON_FILE = 'persons_ref.txt'
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


def file_path(name):
    return '../data/'+STATE + '-' + name


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


homes = dict()
people = dict()
zip2county = dict()
zip = defaultdict(int)
county = defaultdict(int)
unknown = defaultdict(int)

cases_per_day = defaultdict(day_factory)

print 'read zip_county'
t0 = time.clock()
with open(ZIP_COUNTY_FILE, 'rb') as zipfile:
    f = csv.reader(zipfile)
    f.next()
    for row in f:
        zip2county[row[0]] = int(row[1])
t1 = time.clock()
print'\t',len(zip2county),'records in',(t1-t0),' secs'


print 'read people'
t0 = time.clock()
with open(file_path(PERSON_FILE), 'rb') as csvfile:
    f = csv.reader(csvfile, delimiter=' ')
    f.next()
    for row in f:
        people[row[0]] = row

t1 = time.clock()
print'\t',len(people),'records in',(t1-t0),' secs'

print 'parse dendogram'
t0 = time.clock()
n = 0
skipped = 0
with open(file_path(DENDOGRAM_FILE), 'rb') as csvfile:
    f = csv.reader(csvfile, delimiter=' ')
    f.next()

    for row in f:
        if row[4] == "-1":
            skipped += 1
            continue
        n += 1

        # if n > 10000:
        #     break

        day = int(row[2])/86400
        person = people[row[0]]
        # p_home = homes[person[2]]
        p_zip = person[2]
        zip[p_zip] += 1
        if p_zip in zip2county:
            p_age = age_group(int(person[1]))
            p_county = zip2county[p_zip]
            county[p_county] += 1
            entry = cases_per_day[day]
            entry['cases'] += 1
            entry_county = entry['counties'][p_county]
            entry_county['cases'] += 1
            entry_county['age'][p_age] += 1
        else:
            unknown[p_zip] += 1

t1 = time.clock()
print'\t',n,'records in',(t1-t0),' secs'

print 'days:', len(cases_per_day)

# keys = sorted(cases_per_day)
# print [len(x) for x in cases_per_day.values()]

print 'save json'
t0 = time.clock()
with open('../map/assets/'+STATE+'-cases_per_day.json', 'wb') as f:
    json.dump(cases_per_day, f, sort_keys=True) #indent=2,
t1 = time.clock()
print'\t', (t1-t0), ' secs'

print
print 'skipped:', skipped
print
# print 'counties [', len(county),']:', county.items()
# print
# print 'zipcodes [', len(zip), ']:', zip.items()
# print
print 'unknown [', len(unknown),']:', unknown.items()