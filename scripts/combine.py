import csv
from collections import defaultdict

STATE = 'ca'
HOMES_FILE = 'home_locations_ref.txt'
PERSON_FILE = 'persons_ref.txt'
DENDOGRAM_FILE = 'dendogram.txt'
OUTPUT_FILE = 'cases.csv'

ZIP_COUNTY_FILE = '../data/zip_county.csv'


def file_path(name):
    return '../map/data/'+STATE + '-' + name


homes = dict()
people = dict()
zip2county = dict()
zip = defaultdict(int)
county = defaultdict(int)
unknown = defaultdict(int)

cases = defaultdict(list)

print 'read zip_county'
with open(ZIP_COUNTY_FILE, 'rb') as zipfile:
    f = csv.reader(zipfile)
    f.next()
    for row in f:
        zip2county[row[0]] = row[1]

print 'read homes'
with open(file_path(HOMES_FILE), 'rb') as csvfile:
    f = csv.reader(csvfile, delimiter=' ')
    f.next()
    for row in f:
        homes[row[0]] = (row[9], row[8], row[7])

print 'read people'
with open(file_path(PERSON_FILE), 'rb') as csvfile:
    f = csv.reader(csvfile, delimiter=' ')
    f.next()
    for row in f:
        people[row[0]] = row[3]

print 'parse dendogram'
with open(file_path(DENDOGRAM_FILE), 'rb') as csvfile:
    f = csv.reader(csvfile, delimiter=' ')
    f.next()
    n = 0
    skipped = 0
    for row in f:
        if row[4] == "-1":
            skipped += 1
            continue

        n += 1
        # if n > 1000000:
        #     break
        day = int(row[2])/86400
        p = row[0]
        h = homes[people[p]]
        zip[h[2]] += 1
        if h[2] in zip2county:
            county[zip2county[h[2]]] += 1
            cases[day].append([day, h[0], h[1], h[2], zip2county[h[2]]])
        else:
            unknown[h[2]] += 1

    print 'n:',n
    print 'cases:', len(cases)

    keys = sorted(cases)
    print [len(x) for x in cases.values()]

    step = 1
    idx = -step
    ofile = None
    o = None
    for key in keys:
        if key > idx+step-1:
            idx += step
            if ofile:
                ofile.close()
            ofile = open(file_path('cases-'+str(idx)+'.csv'), 'wb')
            o = csv.writer(ofile)
            o.writerow(['day', 'lat', 'lon', 'zip', 'county'])
        o.writerows(cases[key])

    if ofile:
        ofile.close()

    print
    print 'skipped:', skipped
    print
    print 'counties [', len(county),']:', county.items()
    print
    print 'zipcodes [', len(zip), ']:', zip.items()
    print
    print 'unknown [', len(unknown),']:', unknown.items()