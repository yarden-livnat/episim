import csv
import time
import os.path
from sys import argv
from collections import defaultdict

PERSON_FILE = 'persons_ref.txt'
ZIP_COUNTY_FILE = 'zip_county.csv'

OUT_COUNTY_FILE = 'county_pop.csv'

zip2county = defaultdict(str)
pop = defaultdict(int)
missing = defaultdict(int)


# Init
if len(argv) != 2:
    print 'Usage: ', argv[0], '<path to dataset directory>'
    exit(0)

dir_name = argv[1]

if dir_name[-1] != '/':
    dir_name += '/'

# process
with open(ZIP_COUNTY_FILE, 'rb') as zipfile:
    f = csv.reader(zipfile)
    f.next()
    for row in f:
        zip2county[row[0]] = int(row[1])

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
        c = zip2county[p_zip]
        if c != '':
            pop[c] += 1
        else:
            missing[p_zip] += 1

t1 = time.clock()
print '\t',n,'records in',(t1-t0),' secs'
if len(missing) > 0:
    print '\t unknown zip codes:', missing.items()


print 'write', OUT_COUNTY_FILE
t0 = time.clock()
with open(os.path.join(dir_name, OUT_COUNTY_FILE), 'wb') as cfile:
    o = csv.writer(cfile)
    o.writerow(['county', 'pop'])
    o.writerows(pop.items())
t1 = time.clock()
print '\t',len(pop),'records in',(t1-t0),' secs'




